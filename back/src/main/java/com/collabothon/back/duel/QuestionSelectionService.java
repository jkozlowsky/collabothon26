package com.collabothon.back.duel;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.random.RandomGenerator;

import org.springframework.stereotype.Service;

import com.collabothon.back.common.exceptions.BadRequestException;
import com.collabothon.back.duel.DuelQuestion.Difficulty;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/**
 * Selects unique questions for a match using level-based difficulty weights, prefers
 * questions unseen in recent matches, falls back to the nearest difficulty band when
 * exhausted, and shuffles the 4 answer options once per match.
 */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class QuestionSelectionService {

	static final int OPTION_COUNT = 4;

	private final DuelProperties properties;

	/**
	 * Returns the effective level for difficulty weighting: the lower of both players'
	 * category levels in a human match, or the player's own level in bot/solo matches.
	 */
	int effectiveLevel(DuelMode mode, int levelA, Integer levelB) {
		if (mode == DuelMode.HUMAN && levelB != null) {
			return Math.min(levelA, levelB);
		}
		return levelA;
	}

	/** Returns percentage difficulty weights (summing to 100) for a category level. */
	DifficultyWeights weightsForLevel(int level) {
		if (level <= 49) {
			return new DifficultyWeights(70, 25, 5);
		}
		if (level <= 199) {
			return new DifficultyWeights(35, 45, 20);
		}
		return new DifficultyWeights(15, 45, 40);
	}

	/**
	 * Selects {@code questionsPerMatch} unique questions from {@code pool} with shuffled
	 * option orders.
	 *
	 * @param pool all available questions in the category
	 * @param effectiveLevel category level controlling difficulty distribution
	 * @param recentlySeenIds question IDs seen in the last 3 matches (soft exclusion)
	 * @param rng random generator
	 * @return ordered list of selected questions and per-question option permutations
	 * @throws BadRequestException if {@code pool} has fewer questions than required
	 */
	List<SelectedQuestion> select(List<DuelQuestion> pool, int effectiveLevel, Set<Long> recentlySeenIds,
			RandomGenerator rng) {
		int count = properties.questionsPerMatch();
		if (pool.size() < count) {
			throw notEnoughQuestions(count, pool.size());
		}

		Map<Difficulty, List<DuelQuestion>> byDifficulty = new EnumMap<>(Difficulty.class);
		for (Difficulty d : Difficulty.values()) {
			byDifficulty.put(d, new ArrayList<>());
		}
		for (DuelQuestion q : pool) {
			byDifficulty.get(q.getDifficulty()).add(q);
		}

		DifficultyWeights weights = weightsForLevel(effectiveLevel);
		Set<Long> recent = recentlySeenIds == null ? Set.of() : recentlySeenIds;
		List<SelectedQuestion> result = new ArrayList<>(count);

		for (int i = 0; i < count; i++) {
			Difficulty target = rollDifficulty(weights, rng);
			DuelQuestion picked = pickWithFallback(byDifficulty, target, recent, rng);
			result.add(new SelectedQuestion(picked, shuffledOptionOrder(rng)));
		}
		return result;
	}

	/** Generates a uniformly shuffled permutation of {@code [0, 1, 2, 3]}. */
	List<Integer> shuffledOptionOrder(RandomGenerator rng) {
		int[] order = new int[] { 0, 1, 2, 3 };
		for (int i = OPTION_COUNT - 1; i > 0; i--) {
			int j = rng.nextInt(i + 1);
			int tmp = order[i];
			order[i] = order[j];
			order[j] = tmp;
		}
		return List.of(order[0], order[1], order[2], order[3]);
	}

	private Difficulty rollDifficulty(DifficultyWeights weights, RandomGenerator rng) {
		int roll = rng.nextInt(100);
		if (roll < weights.easy()) {
			return Difficulty.EASY;
		}
		if (roll < weights.easy() + weights.medium()) {
			return Difficulty.MEDIUM;
		}
		return Difficulty.HARD;
	}

	private DuelQuestion pickWithFallback(Map<Difficulty, List<DuelQuestion>> byDifficulty, Difficulty target,
			Set<Long> recent, RandomGenerator rng) {
		for (Difficulty band : fallbackOrder(target, rng)) {
			List<DuelQuestion> candidates = byDifficulty.get(band);
			if (candidates.isEmpty()) {
				continue;
			}
			List<DuelQuestion> unseen = new ArrayList<>();
			for (DuelQuestion q : candidates) {
				if (q.getId() == null || !recent.contains(q.getId())) {
					unseen.add(q);
				}
			}
			List<DuelQuestion> pickFrom = unseen.isEmpty() ? candidates : unseen;
			DuelQuestion chosen = pickFrom.get(rng.nextInt(pickFrom.size()));
			candidates.remove(chosen);
			return chosen;
		}
		throw notEnoughQuestions(properties.questionsPerMatch(), 0);
	}

	private Difficulty[] fallbackOrder(Difficulty target, RandomGenerator rng) {
		return switch (target) {
			case EASY -> new Difficulty[] { Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD };
			case HARD -> new Difficulty[] { Difficulty.HARD, Difficulty.MEDIUM, Difficulty.EASY };
			case MEDIUM -> rng.nextBoolean()
					? new Difficulty[] { Difficulty.MEDIUM, Difficulty.EASY, Difficulty.HARD }
					: new Difficulty[] { Difficulty.MEDIUM, Difficulty.HARD, Difficulty.EASY };
		};
	}

	private static BadRequestException notEnoughQuestions(int required, int found) {
		return new BadRequestException("Category needs at least " + required + " questions, found " + found);
	}

	/** Percentage weights for EASY / MEDIUM / HARD question draws. */
	record DifficultyWeights(int easy, int medium, int hard) {
	}

	/** A question chosen for a match with the option order shown to the players. */
	record SelectedQuestion(DuelQuestion question, List<Integer> optionOrder) {

		/** The question in {@code lang}, options in display order, with the display index of the right one. */
		QuestionView view(DuelLang lang) {
			List<String> original = question.getOptions(lang);
			List<String> options = optionOrder.stream().map(original::get).toList();
			return new QuestionView(question.getPrompt(lang), options, optionOrder.indexOf(question.getCorrectIndex()),
					question.getExplanation(lang));
		}

	}

	record QuestionView(String prompt, List<String> options, int correctOption, String explanation) {
	}

}
