package com.collabothon.back.duel;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.locks.ReentrantLock;

import org.springframework.stereotype.Service;

import com.collabothon.back.common.BadRequestException;
import com.collabothon.back.duel.DuelMessage.QueueBotOffer;
import com.collabothon.back.duel.DuelMessage.QueueWaiting;
import com.collabothon.back.duel.DuelPersistenceService.PlayerSnapshot;
import com.collabothon.back.duel.MatchService.MatchedPlayer;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * The human matchmaking queue, one list per category. A newcomer is paired at once with a waiting player within
 * {@code queueEloWindow} Elo; after {@code queueWidenSec} seconds a waiting player takes any rival, and after
 * {@code queueBotOfferSec} seconds they are offered a bot. The queue is guarded by {@link #queueLock}; matches are
 * started and frames sent after the lock is released.
 */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Slf4j
class MatchmakingService {

	private final DuelPersistenceService persistence;

	private final MatchService matchService;

	private final DuelSessionTracker sessionTracker;

	private final DuelMessagePublisher publisher;

	private final DuelProperties properties;

	private final DuelScheduler scheduler;

	private final Clock clock;

	private final ReentrantLock queueLock = new ReentrantLock();

	private final Map<String, List<QueueEntry>> queuesByCategory = new HashMap<>();

	private final Map<String, QueueEntry> queueBySessionId = new HashMap<>();

	/** SOLO and BOT start at once; HUMAN pairs with a waiting rival or waits in the queue. */
	public void joinQueue(String sessionId, String userId, DuelLang lang, String categorySlug, DuelMode mode) {
		DuelCategory category = persistence.requireCategory(categorySlug);
		leaveQueueForSessionOrUser(sessionId, userId);

		if (mode == DuelMode.SOLO) {
			matchService.startSoloMatch(sessionId, userId, lang, category);
			return;
		}
		if (mode == DuelMode.BOT) {
			matchService.startBotMatch(sessionId, userId, lang, category);
			return;
		}

		PlayerSnapshot snapshot = persistence.loadPlayerSnapshot(userId, category.getId());
		QueueEntry partner = null;
		QueueEntry newEntry = null;
		queueLock.lock();
		try {
			List<QueueEntry> list = queuesByCategory.computeIfAbsent(category.getSlug(), k -> new ArrayList<>());
			for (int i = 0; i < list.size(); i++) {
				QueueEntry candidate = list.get(i);
				if (candidate.userId.equals(userId) || !sessionTracker.isOpen(candidate.sessionId)) {
					continue;
				}
				if (Math.abs(candidate.elo - snapshot.elo()) <= properties.queueEloWindow() || candidate.widened) {
					partner = list.remove(i);
					queueBySessionId.remove(partner.sessionId);
					partner.markMatched();
					break;
				}
			}
			if (partner == null) {
				newEntry = new QueueEntry(sessionId, userId, lang, category, snapshot.elo());
				list.add(newEntry);
				queueBySessionId.put(sessionId, newEntry);
			}
		}
		finally {
			queueLock.unlock();
		}

		if (partner != null) {
			matchService.startHumanMatch(partner.toMatchedPlayer(), new MatchedPlayer(sessionId, userId, lang),
					category);
			return;
		}
		publisher.sendToUser(userId, new QueueWaiting(0, false));
		scheduleQueueTicks(newEntry);
	}

	public void leaveQueue(String sessionId) {
		leaveQueueForSessionOrUser(sessionId, null);
	}

	/** Turns a waiting player into an immediate bot match. */
	public void acceptBot(String sessionId, String userId, DuelLang lang) {
		QueueEntry entry;
		queueLock.lock();
		try {
			entry = queueBySessionId.remove(sessionId);
			if (entry != null) {
				removeFromCategoryListLocked(entry);
				entry.cancel();
			}
		}
		finally {
			queueLock.unlock();
		}
		if (entry == null) {
			throw new BadRequestException("Not currently in the matchmaking queue");
		}
		matchService.startBotMatch(sessionId, userId, lang, entry.category);
	}

	private void scheduleQueueTicks(QueueEntry entry) {
		long tickMs = Math.max(10L, properties.queueTickMs());
		ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> onQueueTick(entry),
				clock.instant().plusMillis(tickMs), Duration.ofMillis(tickMs));
		queueLock.lock();
		try {
			if (entry.cancelled || entry.matched) {
				future.cancel(false);
			}
			else {
				entry.tickFuture = future;
			}
		}
		finally {
			queueLock.unlock();
		}
	}

	private void onQueueTick(QueueEntry entry) {
		try {
			QueueEntry partner = null;
			int elapsed;
			boolean widened;
			boolean sendBotOffer = false;

			queueLock.lock();
			try {
				if (entry.cancelled || entry.matched || !sessionTracker.isOpen(entry.sessionId)) {
					queueBySessionId.remove(entry.sessionId);
					removeFromCategoryListLocked(entry);
					entry.cancel();
					return;
				}
				elapsed = ++entry.elapsedSec;
				widened = elapsed >= properties.queueWidenSec();
				entry.widened = widened;
				if (widened) {
					partner = findAnyPartnerLocked(entry);
				}
				if (partner == null && !entry.botOfferSent && elapsed >= properties.queueBotOfferSec()) {
					entry.botOfferSent = true;
					sendBotOffer = true;
				}
			}
			finally {
				queueLock.unlock();
			}

			if (partner != null) {
				matchService.startHumanMatch(entry.toMatchedPlayer(), partner.toMatchedPlayer(), entry.category);
				return;
			}
			publisher.sendToUser(entry.userId, new QueueWaiting(elapsed, widened));
			if (sendBotOffer) {
				publisher.sendToUser(entry.userId, new QueueBotOffer());
			}
		}
		catch (Exception ex) {
			log.error("Matchmaking tick failed for a queued player", ex);
		}
	}

	private QueueEntry findAnyPartnerLocked(QueueEntry entry) {
		List<QueueEntry> list = queuesByCategory.get(entry.category.getSlug());
		if (list == null) {
			return null;
		}
		for (int i = 0; i < list.size(); i++) {
			QueueEntry other = list.get(i);
			if (other == entry || other.userId.equals(entry.userId) || !sessionTracker.isOpen(other.sessionId)) {
				continue;
			}
			QueueEntry partner = list.remove(i);
			list.remove(entry);
			queueBySessionId.remove(partner.sessionId);
			queueBySessionId.remove(entry.sessionId);
			partner.markMatched();
			entry.markMatched();
			return partner;
		}
		return null;
	}

	private void leaveQueueForSessionOrUser(String sessionId, String userId) {
		queueLock.lock();
		try {
			QueueEntry bySession = queueBySessionId.remove(sessionId);
			if (bySession != null) {
				removeFromCategoryListLocked(bySession);
				bySession.cancel();
			}
			if (userId != null) {
				queueBySessionId.values().stream().filter(e -> e.userId.equals(userId)).toList().forEach(e -> {
					queueBySessionId.remove(e.sessionId);
					removeFromCategoryListLocked(e);
					e.cancel();
				});
			}
		}
		finally {
			queueLock.unlock();
		}
	}

	private void removeFromCategoryListLocked(QueueEntry entry) {
		List<QueueEntry> list = queuesByCategory.get(entry.category.getSlug());
		if (list != null) {
			list.remove(entry);
		}
	}

}
