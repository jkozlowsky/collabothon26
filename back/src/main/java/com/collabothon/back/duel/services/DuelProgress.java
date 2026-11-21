package com.collabothon.back.duel.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;

/**
 * A match with the player's answers so far, in question order, and the counts derived from them. Question {@code k}
 * starts when question {@code k - 1} was answered (the first one when the match started).
 */
final class DuelProgress {

	private final DuelMatch match;

	private final List<DuelAnswer> answers;

	private final int questionCount;

	DuelProgress(DuelMatch match, List<DuelAnswer> answers, int questionCount) {
		this.match = match;
		this.answers = new ArrayList<>(answers);
		this.questionCount = questionCount;
	}

	DuelMatch match() {
		return match;
	}

	List<DuelAnswer> answers() {
		return Collections.unmodifiableList(answers);
	}

	int questionCount() {
		return questionCount;
	}

	void add(DuelAnswer answer) {
		answers.add(answer);
	}

	/** Index of the question the player has to answer next; equals {@link #questionCount()} once all are answered. */
	int nextIndex() {
		return answers.size();
	}

	boolean isComplete() {
		return answers.size() >= questionCount;
	}

	DuelAnswer answer(int index) {
		return answers.get(index);
	}

	int score() {
		return (int) answers.stream().filter(DuelAnswer::isCorrect).count();
	}

	int rivalScore() {
		return (int) answers.stream().filter(DuelAnswer::isRivalCorrect).count();
	}

	Instant questionStart(int index) {
		if (index == 0) {
			return match.getStartedAt();
		}
		return answers.get(index - 1).getCreatedAt();
	}

	/** The player's result per question, null for questions not answered yet. */
	List<Boolean> results() {
		List<Boolean> results = new ArrayList<>(Collections.nCopies(questionCount, null));
		for (DuelAnswer answer : answers) {
			results.set(answer.getPosition(), answer.isCorrect());
		}
		return results;
	}

}
