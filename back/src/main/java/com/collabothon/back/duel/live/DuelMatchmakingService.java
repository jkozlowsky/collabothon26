package com.collabothon.back.duel.live;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.collabothon.back.duel.services.DuelMatchService;
import com.collabothon.back.duel.services.LiveMatch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * The live-duel queue: a player waits up to {@link #QUEUE_TIMEOUT} for another account, then gets {@code no-rival}
 * and the client falls back to the simulated rival. Never pairs an account with itself.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DuelMatchmakingService {

	public static final Duration QUEUE_TIMEOUT = Duration.ofSeconds(15);

	static final int MAX_CATEGORIES = 4;

	private final DuelMatchService matchService;

	private final DuelLiveNotifier notifier;

	private final DuelTimers timers;

	private final Clock clock;

	/** Waiting players in queue order; guarded by {@code this}. */
	private final Map<String, Waiting> queue = new LinkedHashMap<>();

	private long sequence;

	private record Waiting(String userId, List<String> categories, Instant queuedAt, long sequence) {
	}

	/** Joins the queue, or pairs with the longest-waiting other account. Queuing again restarts the wait. */
	public void join(String userId, List<String> categories) {
		if (categories == null || categories.isEmpty() || categories.size() > MAX_CATEGORIES) {
			notifier.send(userId, DuelSocketMessages.error("INVALID_CATEGORIES"));
			return;
		}
		Waiting rival;
		Waiting self = null;
		synchronized (this) {
			queue.remove(userId);
			rival = queue.values().stream().filter(waiting -> !waiting.userId().equals(userId)).findFirst().orElse(null);
			if (rival != null) {
				queue.remove(rival.userId());
			}
			else {
				self = new Waiting(userId, List.copyOf(categories), clock.instant(), ++sequence);
				queue.put(userId, self);
			}
		}
		if (rival != null) {
			pair(rival, userId, categories);
			return;
		}
		Waiting queued = self;
		timers.schedule(() -> expire(queued), QUEUE_TIMEOUT);
		notifier.send(userId, DuelSocketMessages.queued(QUEUE_TIMEOUT.toMillis()));
	}

	public synchronized void cancel(String userId) {
		queue.remove(userId);
	}

	private void expire(Waiting waiting) {
		synchronized (this) {
			Waiting current = queue.get(waiting.userId());
			if (current == null || current.sequence() != waiting.sequence()
					|| clock.instant().isBefore(waiting.queuedAt().plus(QUEUE_TIMEOUT))) {
				return;
			}
			queue.remove(waiting.userId());
		}
		notifier.send(waiting.userId(), DuelSocketMessages.noRival());
	}

	private void pair(Waiting first, String secondUserId, List<String> secondCategories) {
		List<String> categories = commonCategories(first.categories(), secondCategories);
		try {
			LiveMatch live = matchService.startLive(first.userId(), secondUserId, categories);
			notifier.send(live.userA(), DuelSocketMessages.matched(live.matchIdA(), live.cardB(), live.categories()));
			notifier.send(live.userB(), DuelSocketMessages.matched(live.matchIdB(), live.cardA(), live.categories()));
		}
		catch (RuntimeException e) {
			log.warn("Could not start a live duel for {} and {}", first.userId(), secondUserId, e);
			notifier.send(first.userId(), DuelSocketMessages.error("MATCH_FAILED"));
			notifier.send(secondUserId, DuelSocketMessages.error("MATCH_FAILED"));
		}
	}

	/** The categories both ticked, in the first player's order; the first player's own when there are none. */
	static List<String> commonCategories(List<String> first, List<String> second) {
		List<String> common = new ArrayList<>(first.stream().filter(second::contains).distinct().toList());
		return common.isEmpty() ? first : common;
	}

}
