package com.collabothon.back.duel;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;

import com.collabothon.back.duel.DuelMessage.AnswerResult;
import com.collabothon.back.duel.DuelMessage.MatchWaiting;
import com.collabothon.back.duel.DuelPersistenceService.MatchCompletion;
import com.collabothon.back.duel.MatchAssembler.MatchResult;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Moves a live {@link ActiveMatch} forward: sends the questions, schedules timeouts and bot answers, tells the rival
 * about progress and settles the match. Callers hold the match lock and send the collected frames after releasing it.
 */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Slf4j
class MatchTurnService {

	private final DuelPersistenceService persistence;

	private final ActiveMatchStore matchStore;

	private final DuelSessionTracker sessionTracker;

	private final DuelMessagePublisher publisher;

	private final BotService botService;

	private final DuelProperties properties;

	private final DuelScheduler scheduler;

	private final MatchMessageMapper messages;

	private final MatchResultMapper results;

	private final Clock clock;

	void launchMatch(ActiveMatch match) {
		matchStore.put(match);
		PlayerSlot slotA = match.getSlotA();
		PlayerSlot slotB = match.getSlotB();
		sessionTracker.setActiveMatch(slotA.getSessionId(), match.getMatchId());
		if (match.getMode() == DuelMode.HUMAN) {
			sessionTracker.setActiveMatch(slotB.getSessionId(), match.getMatchId());
		}

		List<Outbound> outbox = new ArrayList<>();
		match.getLock().lock();
		try {
			emitTo(outbox, slotA, messages.toStart(MatchAssembler.view(match, slotA)));
			startQuestion(match, slotA, outbox);
			if (match.getMode() == DuelMode.HUMAN) {
				emitTo(outbox, slotB, messages.toStart(MatchAssembler.view(match, slotB)));
				startQuestion(match, slotB, outbox);
			}
			else if (match.getMode() == DuelMode.BOT) {
				scheduleBotAnswer(match, slotB);
			}
		}
		finally {
			match.getLock().unlock();
		}
		flush(outbox);
	}

	/** Logs the player's answer and advances their score; the caller sends the result frame. */
	void recordAnswer(ActiveMatch match, PlayerSlot player, int chosenOriginal, boolean correct, int displayOption) {
		int index = player.getCurrentIndex();
		SelectedQuestion selected = match.getQuestions().get(index);
		persistence.saveAnswer(new DuelAnswer(match.getMatchId(), player.getUserId(), selected.question().getId(), index,
				chosenOriginal, correct, DuelAnswer.Outcome.ANSWERED, elapsedMs(player), clock.instant()));
		player.recordAnswer(index, correct, displayOption);
	}

	void advanceHuman(ActiveMatch match, PlayerSlot player, List<Outbound> outbox) {
		if (player.getCurrentIndex() < match.getQuestions().size()) {
			startQuestion(match, player, outbox);
			return;
		}
		player.setFinished(true);
		if (match.isComplete()) {
			finishMatch(match, outbox);
		}
		else {
			emitTo(outbox, player, new MatchWaiting());
		}
	}

	void notifyHumanRival(ActiveMatch match, PlayerSlot source, List<Outbound> outbox) {
		PlayerSlot rival = match.rivalOf(source);
		if (rival != null && !rival.isBot()) {
			emitTo(outbox, rival, messages.toRivalProgress(MatchAssembler.snapshot(source)));
		}
	}

	void emitTo(List<Outbound> outbox, PlayerSlot slot, DuelMessage payload) {
		if (slot.isConnected() && slot.getSessionId() != null && sessionTracker.isOpen(slot.getSessionId())) {
			outbox.add(new Outbound(slot.getUserId(), payload));
		}
	}

	void flush(List<Outbound> outbox) {
		for (Outbound item : outbox) {
			publisher.sendToUser(item.userId(), item.payload());
		}
	}

	private void onPlayerTimeout(ActiveMatch match, PlayerSlot player, int expectedIndex) {
		List<Outbound> outbox = new ArrayList<>();
		match.getLock().lock();
		try {
			if (match.isEnded() || player.isFinished() || player.getCurrentIndex() != expectedIndex) {
				return;
			}
			SelectedQuestion selected = match.getQuestions().get(expectedIndex);
			persistence.saveAnswer(new DuelAnswer(match.getMatchId(), player.getUserId(), selected.question().getId(),
					expectedIndex, null, false, DuelAnswer.Outcome.TIMEOUT, elapsedMs(player), clock.instant()));
			player.recordAnswer(expectedIndex, false, null);

			emitTo(outbox, player, new AnswerResult(expectedIndex, false, true));
			notifyHumanRival(match, player, outbox);
			advanceHuman(match, player, outbox);
		}
		catch (Exception ex) {
			log.error("Timeout handling failed for match {}", match.getMatchId(), ex);
		}
		finally {
			match.getLock().unlock();
		}
		flush(outbox);
	}

	private void onBotAnswer(ActiveMatch match, PlayerSlot bot, int expectedIndex, int delayMs) {
		List<Outbound> outbox = new ArrayList<>();
		match.getLock().lock();
		try {
			if (match.isEnded() || bot.isFinished() || bot.getCurrentIndex() != expectedIndex) {
				return;
			}
			SelectedQuestion selected = match.getQuestions().get(expectedIndex);
			int correctIndex = selected.question().getCorrectIndex();
			int chosenOriginal = botService.chooseOriginalOption(correctIndex, bot.getBotLevel(),
					ThreadLocalRandom.current());
			boolean correct = chosenOriginal == correctIndex;

			persistence.saveAnswer(new DuelAnswer(match.getMatchId(), bot.getUserId(), selected.question().getId(),
					expectedIndex, chosenOriginal, correct, DuelAnswer.Outcome.ANSWERED, delayMs, clock.instant()));
			bot.recordAnswer(expectedIndex, correct, null);

			emitTo(outbox, match.getSlotA(), messages.toRivalProgress(MatchAssembler.snapshot(bot)));
			if (bot.getCurrentIndex() < match.getQuestions().size()) {
				scheduleBotAnswer(match, bot);
			}
			else {
				bot.setFinished(true);
				if (match.isComplete()) {
					finishMatch(match, outbox);
				}
			}
		}
		catch (Exception ex) {
			log.error("Bot answer failed for match {}", match.getMatchId(), ex);
		}
		finally {
			match.getLock().unlock();
		}
		flush(outbox);
	}

	private void startQuestion(ActiveMatch match, PlayerSlot player, List<Outbound> outbox) {
		int index = player.getCurrentIndex();
		long now = clock.millis();
		long timeoutMs = properties.questionTimeoutMs();
		player.setQuestionStartedAt(now);
		player.setQuestionDeadline(now + timeoutMs);

		emitTo(outbox, player, messages.toQuestion(MatchAssembler.question(match, player, index)));
		player.setTimerFuture(
				scheduler.schedule(() -> onPlayerTimeout(match, player, index), Instant.ofEpochMilli(now + timeoutMs)));
	}

	private void scheduleBotAnswer(ActiveMatch match, PlayerSlot bot) {
		int index = bot.getCurrentIndex();
		long delayMs = botService.answerDelayMs(ThreadLocalRandom.current());
		bot.setTimerFuture(scheduler.schedule(() -> onBotAnswer(match, bot, index, (int) delayMs),
				clock.instant().plusMillis(delayMs)));
	}

	private void finishMatch(ActiveMatch match, List<Outbound> outbox) {
		if (match.isEnded()) {
			return;
		}
		match.markEndedAndCancelTimers();
		matchStore.remove(match.getMatchId());

		PlayerSlot slotA = match.getSlotA();
		PlayerSlot slotB = match.getSlotB();
		Integer scoreB = match.getMode() == DuelMode.SOLO ? null : Objects.requireNonNull(slotB).getScore();
		MatchCompletion completion = persistence.completeMatch(match.getMatchId(), slotA.getScore(), scoreB,
				!match.hasAnyConnectedHuman(), clock.instant());
		if (completion.abandoned()) {
			return;
		}

		emitTo(outbox, slotA, resultFor(match, slotA, scoreB, MatchAssembler.postMatchRival(slotB, completion.playerB()),
				completion));
		if (match.getMode() == DuelMode.HUMAN) {
			emitTo(outbox, slotB, resultFor(match, slotB, slotA.getScore(),
					MatchAssembler.postMatchRival(slotA, completion.playerA()), completion));
		}
	}

	private DuelMessage resultFor(ActiveMatch match, PlayerSlot player, Integer rivalScore, PlayerCard rival,
			MatchCompletion completion) {
		MatchResult result = MatchAssembler.liveResult(match, player, rivalScore, rival,
				player == match.getSlotA() ? completion.playerA() : completion.playerB());
		return results.toMessage(result);
	}

	private int elapsedMs(PlayerSlot player) {
		return (int) Math.max(0L, clock.millis() - player.getQuestionStartedAt());
	}

	record Outbound(String userId, DuelMessage payload) {
	}

}
