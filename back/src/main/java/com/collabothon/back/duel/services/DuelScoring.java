package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.duel.YourFinalDto;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.MatchOutcome;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/**
 * Scores and settles matches. XP is awarded as soon as the player has answered every question (5 per correct answer,
 * HUMAN only), even while the rival still plays; the match is finished once the rival's last answer is visible.
 */
@Component
@RequiredArgsConstructor
public class DuelScoring {

	static final int XP_PER_CORRECT_ANSWER = 5;

	private final XpService xpService;

	private final Clock clock;

	/**
	 * Awards XP and finishes the match when it is due. Safe to call on every request: each step runs once. Runs in
	 * the caller's transaction; the match changes are flushed by dirty checking.
	 */
	void settle(DuelProgress progress) {
		DuelMatch match = progress.match();
		if (!progress.isComplete() || match.isFinished()) {
			return;
		}
		if (match.getScore() == null) {
			awardXp(progress);
		}
		if (!match.hasRival()) {
			match.finish(MatchOutcome.SOLO, progress.score(), null, clock.instant());
			return;
		}
		if (match.isLive()) {
			// A live duel ends when the opponent has answered or timed out on every question.
			if (progress.isOpponentComplete()) {
				match.finish(outcome(progress.score(), progress.rivalScore()), progress.score(), progress.rivalScore(),
						clock.instant());
			}
			return;
		}
		Instant lastRivalAnswer = progress.answer(progress.questionCount() - 1).getRivalAnswerAt();
		Instant now = clock.instant();
		if (lastRivalAnswer != null && !now.isBefore(lastRivalAnswer)) {
			match.finish(outcome(progress.score(), progress.rivalScore()), progress.score(), progress.rivalScore(),
					now);
		}
	}

	/** The player's final score and XP, or null until every question is answered. */
	YourFinalDto yourFinal(DuelProgress progress) {
		if (!progress.isComplete()) {
			return null;
		}
		return new YourFinalDto(progress.score(), xpGained(progress));
	}

	/** XP earned per story category; empty in SOLO matches. */
	Map<String, Integer> xpByCategory(DuelProgress progress) {
		Map<String, Integer> xp = new TreeMap<>();
		if (!progress.match().hasRival()) {
			return xp;
		}
		for (DuelAnswer answer : progress.answers()) {
			if (answer.isCorrect()) {
				xp.merge(answer.getCategory(), XP_PER_CORRECT_ANSWER, Integer::sum);
			}
		}
		return xp;
	}

	private void awardXp(DuelProgress progress) {
		DuelMatch match = progress.match();
		String sourceRef = String.valueOf(match.getId());
		xpByCategory(progress).forEach((category, xp) -> xpService.record(match.getUserId(), category, XpSource.DUEL,
				sourceRef, xp, clock.instant()));
		match.recordPlayerScore(progress.score(), xpGained(progress));
	}

	private static int xpGained(DuelProgress progress) {
		if (!progress.match().hasRival()) {
			return 0;
		}
		return progress.score() * XP_PER_CORRECT_ANSWER;
	}

	private static MatchOutcome outcome(int score, int rivalScore) {
		if (score > rivalScore) {
			return MatchOutcome.WIN;
		}
		if (score == rivalScore) {
			return MatchOutcome.DRAW;
		}
		return MatchOutcome.LOSS;
	}

}
