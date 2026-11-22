package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.duel.YourFinalDto;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.MatchOutcome;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** XP is awarded as soon as the player is done; the match finishes once the rival is done too. */
@Component
@RequiredArgsConstructor
public class DuelScoring {

	private final XpService xpService;

	private final Clock clock;

	/** Safe to call on every request: each step runs once. Runs in the caller's transaction. */
	void settle(DuelProgress progress) {
		DuelMatch match = progress.getMatch();
		if (!progress.isComplete() || match.isFinished()) {
			return;
		}
		if (!match.hasPlayerScore()) {
			awardXp(progress);
		}
		Instant now = clock.instant();
		if (!match.hasRival()) {
			match.finish(MatchOutcome.SOLO, progress.score(), null, now);
			return;
		}
		if (hasRivalFinished(progress, now)) {
			int score = progress.score();
			int rivalScore = progress.rivalScore();
			match.finish(outcome(score, rivalScore), score, rivalScore, now);
		}
	}

	/** Null until every question is answered. */
	YourFinalDto yourFinal(DuelProgress progress) {
		if (!progress.isComplete()) {
			return null;
		}
		return new YourFinalDto(progress.score(), xpGained(progress));
	}

	/** Empty in SOLO matches. */
	Map<String, Integer> xpByCategory(DuelProgress progress) {
		Map<String, Integer> xp = new TreeMap<>();
		if (!progress.getMatch().hasRival()) {
			return xp;
		}
		for (DuelAnswer answer : progress.getAnswers()) {
			if (answer.isCorrect()) {
				xp.merge(answer.getCategory(), DuelConsts.XP_PER_CORRECT_ANSWER, Integer::sum);
			}
		}
		return xp;
	}

	private static boolean hasRivalFinished(DuelProgress progress, Instant now) {
		if (progress.getMatch().isLive()) {
			return progress.isOpponentComplete();
		}
		return progress.answer(progress.getQuestionCount() - 1).isRivalAnsweredAt(now);
	}

	private void awardXp(DuelProgress progress) {
		DuelMatch match = progress.getMatch();
		String sourceRef = String.valueOf(match.getId());
		xpByCategory(progress).forEach((category, xp) -> xpService.record(match.getUserId(), category, XpSource.DUEL,
				sourceRef, xp, clock.instant()));
		match.recordPlayerScore(progress.score(), xpGained(progress));
	}

	private static int xpGained(DuelProgress progress) {
		if (!progress.getMatch().hasRival()) {
			return 0;
		}
		return progress.score() * DuelConsts.XP_PER_CORRECT_ANSWER;
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
