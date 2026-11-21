package com.collabothon.back.duel;

import org.springframework.stereotype.Service;

/**
 * Pure Elo rating and calibration calculations for human-vs-human duel matches.
 * Bot and solo matches never alter Elo.
 */
@Service
class EloService {

	static final int CALIBRATION_MATCHES = 5;

	static final int PROVISIONAL_MATCHES = 10;

	static final int K_PROVISIONAL = 32;

	static final int K_STANDARD = 16;

	/**
	 * Returns whether a player has completed enough human matches to appear in rankings.
	 *
	 * @param humanMatches completed human matches in the category
	 * @return {@code true} once {@code humanMatches >= 5}
	 */
	boolean isCalibrated(int humanMatches) {
		return humanMatches >= CALIBRATION_MATCHES;
	}

	/**
	 * Returns the K-factor: 32 for the first 10 human matches, 16 thereafter.
	 *
	 * @param humanMatchesBefore human matches completed prior to the current match
	 * @return Elo K-factor
	 */
	int kFactor(int humanMatchesBefore) {
		return humanMatchesBefore < PROVISIONAL_MATCHES ? K_PROVISIONAL : K_STANDARD;
	}

	/**
	 * Computes the standard Elo expected score in {@code (0, 1)}.
	 *
	 * @param playerElo player's rating before the match
	 * @param rivalElo rival's rating before the match
	 * @return expected score
	 */
	double expectedScore(int playerElo, int rivalElo) {
		return 1.0 / (1.0 + Math.pow(10.0, (rivalElo - playerElo) / 400.0));
	}

	/**
	 * Computes the signed Elo delta for one player in a completed human match.
	 *
	 * @param playerElo player's rating before the match
	 * @param rivalElo rival's rating before the match
	 * @param humanMatchesBefore human matches played before this match
	 * @param outcome match outcome ({@code WIN}, {@code DRAW} or {@code LOSS})
	 * @return rounded Elo adjustment
	 * @throws IllegalArgumentException if {@code outcome} is {@link MatchOutcome#SOLO}
	 */
	int delta(int playerElo, int rivalElo, int humanMatchesBefore, MatchOutcome outcome) {
		double actual = switch (outcome) {
			case WIN -> 1.0;
			case DRAW -> 0.5;
			case LOSS -> 0.0;
			case SOLO -> throw new IllegalArgumentException("Elo is not updated for SOLO");
		};
		double expected = expectedScore(playerElo, rivalElo);
		int k = kFactor(humanMatchesBefore);
		return (int) Math.round(k * (actual - expected));
	}

}
