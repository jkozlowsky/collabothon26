package com.collabothon.back.duel;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.Getter;
import lombok.Setter;

/**
 * In-memory state of one match from the player's side, plus the simulated rival's schedule. Callers synchronise on the
 * instance; nothing here reads a clock, the service passes {@code now} in.
 */
@Getter
final class ActiveMatch {

	private final long matchId;

	private final DuelMode mode;

	private final DuelCategory category;

	private final List<SelectedQuestion> questions;

	private final String userId;

	private final PlayerCard you;

	/** Null in solo matches. */
	private final PlayerCard rivalCard;

	/** Null in solo matches. */
	private final RivalPlan rival;

	private final long startedAtMs;

	private final Boolean[] results;

	private final boolean[] timedOut;

	private final Integer[] chosenDisplayOptions;

	@Setter
	private DuelLang lang;

	private int currentIndex;

	private long questionStartedAt;

	private long questionDeadline;

	private int score;

	private boolean ended;

	private long endedAtMs;

	ActiveMatch(long matchId, DuelMode mode, DuelCategory category, List<SelectedQuestion> questions, String userId,
			PlayerCard you, PlayerCard rivalCard, RivalPlan rival, DuelLang lang, long startedAtMs, long timeoutMs) {
		this.matchId = matchId;
		this.mode = mode;
		this.category = category;
		this.questions = List.copyOf(questions);
		this.userId = userId;
		this.you = you;
		this.rivalCard = rivalCard;
		this.rival = rival;
		this.lang = lang;
		this.startedAtMs = startedAtMs;
		this.results = new Boolean[questions.size()];
		this.timedOut = new boolean[questions.size()];
		this.chosenDisplayOptions = new Integer[questions.size()];
		startQuestion(startedAtMs, timeoutMs);
	}

	boolean isFinished() {
		return currentIndex >= questions.size();
	}

	List<Boolean> resultsCopy() {
		return new ArrayList<>(Arrays.asList(results));
	}

	/** The current question was answered at {@code at}; the next one starts then. */
	void recordAnswer(boolean correct, Integer displayOption, long at, long timeoutMs) {
		store(correct, displayOption, false);
		advance(at, timeoutMs);
	}

	/** The current question ran out at its deadline; the next one starts at that deadline. */
	void recordTimeout(long timeoutMs) {
		store(false, null, true);
		advance(questionDeadline, timeoutMs);
	}

	void end(long at) {
		ended = true;
		endedAtMs = at;
	}

	private void store(boolean correct, Integer displayOption, boolean timeout) {
		results[currentIndex] = correct;
		timedOut[currentIndex] = timeout;
		chosenDisplayOptions[currentIndex] = displayOption;
		if (correct) {
			score++;
		}
	}

	private void advance(long at, long timeoutMs) {
		currentIndex++;
		if (!isFinished()) {
			startQuestion(at, timeoutMs);
		}
	}

	private void startQuestion(long at, long timeoutMs) {
		questionStartedAt = at;
		questionDeadline = at + timeoutMs;
	}

}
