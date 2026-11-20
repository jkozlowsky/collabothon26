package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.collabothon.back.common.BadRequestException;
import com.collabothon.back.duel.LevelCurve.LevelInfo;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

class DuelDomainServicesTest {

	private static final DuelProperties DEFAULTS = new DuelProperties(6, 40_000L, 5, 10, 1_000L, 150, 8_000L, 30_000L);

	private final LevelCurve levelCurve = new LevelCurve();
	private final ScoringService scoringService = new ScoringService();
	private final EloService eloService = new EloService();
	private final BotService botService = new BotService(DEFAULTS);
	private final QuestionSelectionService questionSelectionService = new QuestionSelectionService(
			DEFAULTS);

	@Test
	void levelCurveMatchesSpecTableAndIsMonotonic() {
		assertThat(levelCurve.totalXpForLevel(1)).isEqualTo(0);
		assertThat(levelCurve.costForNextLevel(1)).isEqualTo(22);
		assertThat(levelCurve.totalXpForLevel(2)).isEqualTo(22);
		assertThat(levelCurve.costForNextLevel(2)).isEqualTo(24);
		assertThat(levelCurve.totalXpForLevel(10)).isEqualTo(298);
		assertThat(levelCurve.costForNextLevel(10)).isEqualTo(48);
		assertThat(levelCurve.totalXpForLevel(50)).isEqualTo(5_073);
		assertThat(levelCurve.costForNextLevel(50)).isEqualTo(200);
		assertThat(levelCurve.totalXpForLevel(100)).isEqualTo(20_343);
		assertThat(levelCurve.costForNextLevel(100)).isEqualTo(419);
		assertThat(levelCurve.totalXpForLevel(200)).isEqualTo(85_921);
		assertThat(levelCurve.costForNextLevel(200)).isEqualTo(906);
		assertThat(levelCurve.totalXpForLevel(300)).isEqualTo(202_255);
		assertThat(levelCurve.costForNextLevel(300)).isEqualTo(1_432);
		assertThat(levelCurve.totalXpForLevel(500)).isEqualTo(599_433);

		for (int n = 1; n < LevelCurve.MAX_LEVEL - 1; n++) {
			assertThat(levelCurve.costForNextLevel(n + 1)).isGreaterThanOrEqualTo(levelCurve.costForNextLevel(n));
		}
	}

	@Test
	void levelLookupHandlesBoundariesAndMaxLevel() {
		assertThat(levelCurve.fromXp(-10)).isEqualTo(new LevelInfo(1, 0, 22));
		assertThat(levelCurve.fromXp(0)).isEqualTo(new LevelInfo(1, 0, 22));
		assertThat(levelCurve.fromXp(21)).isEqualTo(new LevelInfo(1, 21, 22));
		assertThat(levelCurve.fromXp(22)).isEqualTo(new LevelInfo(2, 0, 24));
		assertThat(levelCurve.fromXp(298)).isEqualTo(new LevelInfo(10, 0, 48));

		LevelInfo max = levelCurve.fromXp(999_999);
		assertThat(max.level()).isEqualTo(500);
		assertThat(max.xpForLevel()).isPositive();
		assertThat(max.xpIntoLevel()).isEqualTo(max.xpForLevel());
	}

	@Test
	void scoringComputesXpPerModeAndOutcome() {
		assertThat(scoringService.outcome(DuelMode.SOLO, 4, null)).isEqualTo(MatchOutcome.SOLO);
		assertThat(scoringService.xpGained(DuelMode.SOLO, 4, MatchOutcome.SOLO)).isEqualTo(32);

		assertThat(scoringService.outcome(DuelMode.HUMAN, 4, 3)).isEqualTo(MatchOutcome.WIN);
		assertThat(scoringService.xpGained(DuelMode.HUMAN, 4, MatchOutcome.WIN)).isEqualTo(52);
		assertThat(scoringService.xpGained(DuelMode.BOT, 4, MatchOutcome.WIN)).isEqualTo(52);

		assertThat(scoringService.outcome(DuelMode.HUMAN, 3, 3)).isEqualTo(MatchOutcome.DRAW);
		assertThat(scoringService.xpGained(DuelMode.HUMAN, 3, MatchOutcome.DRAW)).isEqualTo(34);
		assertThat(scoringService.xpGained(DuelMode.BOT, 3, MatchOutcome.DRAW)).isEqualTo(34);

		assertThat(scoringService.outcome(DuelMode.HUMAN, 2, 5)).isEqualTo(MatchOutcome.LOSS);
		assertThat(scoringService.xpGained(DuelMode.HUMAN, 2, MatchOutcome.LOSS)).isEqualTo(16);
	}

	@Test
	void eloHandlesKFactorSwitchCalibrationAndDraws() {
		assertThat(eloService.isCalibrated(4)).isFalse();
		assertThat(eloService.isCalibrated(5)).isTrue();
		assertThat(eloService.kFactor(0)).isEqualTo(32);
		assertThat(eloService.kFactor(9)).isEqualTo(32);
		assertThat(eloService.kFactor(10)).isEqualTo(16);
		assertThat(eloService.kFactor(50)).isEqualTo(16);

		assertThat(eloService.expectedScore(1000, 1000)).isCloseTo(0.5, within(1e-9));
		assertThat(eloService.expectedScore(1400, 1000)).isCloseTo(10.0 / 11.0, within(1e-9));

		assertThat(eloService.delta(1000, 1000, 0, MatchOutcome.WIN)).isEqualTo(16);
		assertThat(eloService.delta(1000, 1000, 0, MatchOutcome.DRAW)).isEqualTo(0);
		assertThat(eloService.delta(1000, 1000, 0, MatchOutcome.LOSS)).isEqualTo(-16);
		assertThat(eloService.delta(1000, 1000, 10, MatchOutcome.WIN)).isEqualTo(8);
		assertThat(eloService.delta(1000, 1000, 10, MatchOutcome.DRAW)).isEqualTo(0);
		assertThat(eloService.delta(1000, 1000, 10, MatchOutcome.LOSS)).isEqualTo(-8);

		assertThat(eloService.delta(900, 1200, 10, MatchOutcome.WIN))
			.isGreaterThan(eloService.delta(1200, 900, 10, MatchOutcome.WIN));
		assertThat(eloService.delta(900, 1200, 10, MatchOutcome.DRAW)).isPositive();
		assertThat(eloService.delta(1200, 900, 10, MatchOutcome.DRAW)).isNegative();
	}

	@Test
	void questionSelectionRespectsWeightsNoRepeatsFallbackAndShuffling() {
		assertThat(questionSelectionService.effectiveLevel(DuelMode.HUMAN, 120, 15)).isEqualTo(15);
		assertThat(questionSelectionService.effectiveLevel(DuelMode.BOT, 120, 15)).isEqualTo(120);

		assertThatThrownBy(() -> questionSelectionService.select(buildPool(2, 1, 1), 1, Set.of(), new Random(1L)))
			.isInstanceOf(BadRequestException.class);

		List<DuelQuestion> pool = buildPool(5, 5, 5);
		Random rng = new Random(42L);

		List<SelectedQuestion> picked = questionSelectionService.select(pool, 10, Set.of(), rng);
		assertThat(picked).hasSize(6);
		assertThat(picked.stream().map(sq -> sq.question().getId()).distinct().count()).isEqualTo(6);
		picked.forEach(sq -> assertThat(sq.optionOrder()).containsExactlyInAnyOrder(0, 1, 2, 3));

		int easyLow = 0, hardLow = 0, easyHigh = 0, hardHigh = 0;
		for (int i = 0; i < 400; i++) {
			for (SelectedQuestion sq : questionSelectionService.select(pool, 10, Set.of(), rng)) {
				if (sq.question().getDifficulty() == DuelQuestion.Difficulty.EASY) easyLow++;
				else if (sq.question().getDifficulty() == DuelQuestion.Difficulty.HARD) hardLow++;
			}
			for (SelectedQuestion sq : questionSelectionService.select(pool, 300, Set.of(), rng)) {
				if (sq.question().getDifficulty() == DuelQuestion.Difficulty.EASY) easyHigh++;
				else if (sq.question().getDifficulty() == DuelQuestion.Difficulty.HARD) hardHigh++;
			}
		}
		assertThat(easyLow).isGreaterThan(hardLow * 3);
		assertThat(hardHigh).isGreaterThan(easyHigh);

		List<SelectedQuestion> fallback = questionSelectionService.select(buildPool(0, 6, 6), 1, Set.of(),
				new Random(7L));
		assertThat(fallback.stream().filter(sq -> sq.question().getDifficulty() == DuelQuestion.Difficulty.MEDIUM).count())
			.isGreaterThanOrEqualTo(4);

		List<SelectedQuestion> pickedRecent = questionSelectionService.select(buildPool(6, 0, 0), 1,
				Set.of(1L, 2L, 3L, 4L), new Random(1L));
		Set<Long> firstTwoIds = new HashSet<>(
				List.of(pickedRecent.get(0).question().getId(), pickedRecent.get(1).question().getId()));
		assertThat(firstTwoIds).containsExactlyInAnyOrder(5L, 6L);
	}

	@Test
	void botAccuracyLevelAndTimingMatchSpec() {
		assertThat(botService.accuracyProbability(1)).isCloseTo(0.4679, within(0.001));
		assertThat(botService.accuracyProbability(100)).isCloseTo(0.6289, within(0.001));
		assertThat(botService.accuracyProbability(500)).isCloseTo(0.85, within(1e-9));

		Random rng = new Random(123L);
		for (int i = 0; i < 200; i++) {
			assertThat(botService.computeLevel(100, rng)).isBetween(90, 110);
			assertThat(botService.computeLevel(1, rng)).isBetween(1, 2);
			assertThat(botService.computeLevel(500, rng)).isBetween(450, 500);
			assertThat(botService.answerDelayMs(rng)).isBetween(8_000L, 30_000L);
		}

		int trials = 10_000;
		int correct = 0;
		for (int i = 0; i < trials; i++) {
			int chosen = botService.chooseOriginalOption(2, 100, rng);
			assertThat(chosen).isBetween(0, 3);
			if (chosen == 2) {
				correct++;
			}
		}
		assertThat((double) correct / trials).isCloseTo(botService.accuracyProbability(100), within(0.02));
	}

	private static List<DuelQuestion> buildPool(int easy, int medium, int hard) {
		List<DuelQuestion> list = new ArrayList<>();
		long id = 1;
		for (int i = 0; i < easy; i++) list.add(sampleQuestion(id++, DuelQuestion.Difficulty.EASY));
		for (int i = 0; i < medium; i++) list.add(sampleQuestion(id++, DuelQuestion.Difficulty.MEDIUM));
		for (int i = 0; i < hard; i++) list.add(sampleQuestion(id++, DuelQuestion.Difficulty.HARD));
		return list;
	}

	private static DuelQuestion sampleQuestion(long id, DuelQuestion.Difficulty difficulty) {
		return new DuelQuestion(id, 1L, difficulty, "Prompt EN " + id, "Prompt PL " + id,
				List.of("A", "B", "C", "D"), List.of("A_pl", "B_pl", "C_pl", "D_pl"), 1, "Because EN", "Bo PL");
	}

}
