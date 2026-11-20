package com.collabothon.back.duel;

import org.springframework.stereotype.Service;

/**
 * Computes match outcomes and XP rewards across human, bot and solo duel modes.
 * Speed never influences score or XP.
 */
@Service
class ScoringService {

	static final int XP_PER_CORRECT = 8;

	static final int XP_WIN_BONUS = 20;

	static final int XP_DRAW_BONUS = 10;

	/**
	 * Determines a player's match outcome from scores.
	 *
	 * @param mode duel mode
	 * @param score player's correct answer count
	 * @param rivalScore rival's correct answer count (ignored for {@link DuelMode#SOLO})
	 * @return resolved match outcome
	 * @throws IllegalArgumentException if {@code rivalScore} is null in non-solo mode
	 */
	MatchOutcome outcome(DuelMode mode, int score, Integer rivalScore) {
		if (mode == DuelMode.SOLO) {
			return MatchOutcome.SOLO;
		}
		if (rivalScore == null) {
			throw new IllegalArgumentException("rivalScore is required for mode " + mode);
		}
		if (score > rivalScore) {
			return MatchOutcome.WIN;
		}
		if (score == rivalScore) {
			return MatchOutcome.DRAW;
		}
		return MatchOutcome.LOSS;
	}

	/**
	 * Computes XP gained: 8 per correct answer plus 20 for a win or 10 for a draw in
	 * human and bot matches; solo mode grants 8 per correct answer only.
	 *
	 * @param mode duel mode
	 * @param correctCount number of correct answers
	 * @param outcome player's match outcome
	 * @return XP gained
	 */
	int xpGained(DuelMode mode, int correctCount, MatchOutcome outcome) {
		int base = Math.max(0, correctCount) * XP_PER_CORRECT;
		if (mode == DuelMode.SOLO) {
			return base;
		}
		return switch (outcome) {
			case WIN -> base + XP_WIN_BONUS;
			case DRAW -> base + XP_DRAW_BONUS;
			case LOSS, SOLO -> base;
		};
	}

}
