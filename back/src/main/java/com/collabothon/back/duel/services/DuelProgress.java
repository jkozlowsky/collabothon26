package com.collabothon.back.duel.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Function;

import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;

import lombok.AccessLevel;
import lombok.Getter;

/** A match with the answers so far, in question order. A question starts when the previous one was answered. */
public final class DuelProgress {

	@Getter(AccessLevel.PACKAGE)
	private final DuelMatch match;

	private final List<DuelAnswer> answers;

	@Getter(AccessLevel.PACKAGE)
	private final int questionCount;

	@Getter(AccessLevel.PACKAGE)
	private final List<DuelAnswer> opponentAnswers;

	DuelProgress(DuelMatch match, List<DuelAnswer> answers, int questionCount) {
		this(match, answers, questionCount, List.of());
	}

	DuelProgress(DuelMatch match, List<DuelAnswer> answers, int questionCount, List<DuelAnswer> opponentAnswers) {
		this.match = match;
		this.answers = new ArrayList<>(answers);
		this.questionCount = questionCount;
		this.opponentAnswers = List.copyOf(opponentAnswers);
	}

	List<DuelAnswer> getAnswers() {
		return Collections.unmodifiableList(answers);
	}

	void add(DuelAnswer answer) {
		answers.add(answer);
	}

	int nextIndex() {
		return answers.size();
	}

	boolean isComplete() {
		return answers.size() >= questionCount;
	}

	boolean isOpponentComplete() {
		return opponentAnswers.size() >= questionCount;
	}

	DuelAnswer answer(int index) {
		return answers.get(index);
	}

	int score() {
		return (int) answers.stream().filter(DuelAnswer::isCorrect).count();
	}

	int rivalScore() {
		if (match.isLive()) {
			return (int) opponentAnswers.stream().filter(DuelAnswer::isCorrect).count();
		}
		return (int) answers.stream().filter(DuelAnswer::isRivalCorrect).count();
	}

	Instant questionStart(int index) {
		if (index == 0) {
			return match.getStartedAt();
		}
		return answers.get(index - 1).getCreatedAt();
	}

	/** One entry per question, null where {@code shown} has no answer yet. */
	List<Boolean> resultsPerQuestion(List<DuelAnswer> shown, Function<DuelAnswer, Boolean> result) {
		List<Boolean> results = new ArrayList<>(Collections.nCopies(questionCount, null));
		shown.forEach(answer -> results.set(answer.getPosition(), result.apply(answer)));
		return results;
	}

}
