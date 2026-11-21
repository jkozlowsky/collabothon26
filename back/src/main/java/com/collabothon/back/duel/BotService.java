package com.collabothon.back.duel;

import java.util.List;
import java.util.random.RandomGenerator;

import org.springframework.stereotype.Service;

import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/**
 * Server-side bot opponent personas, level scaling, accuracy curve and response delays.
 */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class BotService {

	static final List<BotPersona> PERSONAS = List.of(
			new BotPersona("Bella the Bot"),
			new BotPersona("Max the Bot"),
			new BotPersona("Clara the Bot"),
			new BotPersona("Otto the Bot"));

	private final DuelProperties properties;

	/** Picks a random named bot persona. */
	BotPersona pickPersona(RandomGenerator rng) {
		return PERSONAS.get(rng.nextInt(PERSONAS.size()));
	}

	/** Returns the synthetic user id stored in {@code duel_answer} for a bot. */
	String botUserId(String botName) {
		return "bot:" + botName;
	}

	/**
	 * Computes bot level as the player's category level +/- 10%, clamped to 1..500.
	 *
	 * @param playerLevel player's current category level
	 * @param rng random generator
	 * @return bot level in {@code 1..500}
	 */
	int computeLevel(int playerLevel, RandomGenerator rng) {
		double factor = 0.9 + rng.nextDouble() * 0.2;
		int raw = (int) Math.round(playerLevel * factor);
		return Math.clamp(raw, LevelCurve.MIN_LEVEL, LevelCurve.MAX_LEVEL);
	}

	/**
	 * Computes per-question bot accuracy {@code clamp(0.45 + 0.40 * sqrt(level / 500), 0.45, 0.85)}.
	 *
	 * @param botLevel bot level
	 * @return probability of choosing the correct option
	 */
	double accuracyProbability(int botLevel) {
		int clamped = Math.clamp(botLevel, LevelCurve.MIN_LEVEL, LevelCurve.MAX_LEVEL);
		double p = 0.45 + 0.40 * Math.sqrt(clamped / 500.0);
		return Math.clamp(p, 0.45, 0.85);
	}

	/** Draws a bot answer delay within the configured {@code app.duel.bot-*-delay-ms} range. */
	long answerDelayMs(RandomGenerator rng) {
		return answerDelayMs(properties.botMinDelayMs(), properties.botMaxDelayMs(), rng);
	}

	/** Draws a bot answer delay within {@code [minMs, maxMs]}. */
	long answerDelayMs(long minMs, long maxMs, RandomGenerator rng) {
		if (maxMs <= minMs) {
			return Math.max(0L, minMs);
		}
		return minMs + rng.nextLong(maxMs - minMs + 1);
	}

	/**
	 * Chooses an ORIGINAL option index (0..3) according to the bot's accuracy probability.
	 *
	 * @param correctOriginalIndex index of the correct option in the unshuffled options list
	 * @param botLevel bot level
	 * @param rng random generator
	 * @return chosen original option index in {@code 0..3}
	 */
	int chooseOriginalOption(int correctOriginalIndex, int botLevel, RandomGenerator rng) {
		if (rng.nextDouble() < accuracyProbability(botLevel)) {
			return correctOriginalIndex;
		}
		int offset = 1 + rng.nextInt(3);
		return (correctOriginalIndex + offset) % 4;
	}

	/**
	 * Draws a simulated rival's whole match: a pick for every question (right with the accuracy of
	 * {@code level}) and cumulative answer times, each answer taking a delay from the configured range.
	 */
	RivalPlan planMatch(String userId, int level, List<SelectedQuestion> questions, RandomGenerator rng) {
		int count = questions.size();
		int[] chosen = new int[count];
		boolean[] correct = new boolean[count];
		long[] at = new long[count];
		long elapsed = 0;
		for (int i = 0; i < count; i++) {
			int correctIndex = questions.get(i).question().getCorrectIndex();
			chosen[i] = chooseOriginalOption(correctIndex, level, rng);
			correct[i] = chosen[i] == correctIndex;
			elapsed += answerDelayMs(rng);
			at[i] = elapsed;
		}
		return new RivalPlan(userId, level, chosen, correct, at);
	}

	/** Named bot persona; bots have no avatar (the UI shows the bot icon). */
	record BotPersona(String name) {
	}

}
