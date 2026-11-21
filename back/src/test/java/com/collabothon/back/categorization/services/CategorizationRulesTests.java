package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.services.CategorizationRules.BUFFER;
import static com.collabothon.back.categorization.services.CategorizationRules.NEUTRAL_LINE;
import static com.collabothon.back.categorization.services.CategorizationRules.confidenceGaps;
import static com.collabothon.back.categorization.services.CategorizationRules.fallbackFocus;
import static com.collabothon.back.categorization.services.CategorizationRules.fallbackRole;
import static com.collabothon.back.categorization.services.CategorizationRules.focusBecause;
import static com.collabothon.back.categorization.services.CategorizationRules.focusFromNoul;
import static com.collabothon.back.categorization.services.CategorizationRules.lessonVariant;
import static com.collabothon.back.categorization.services.CategorizationRules.roleBecause;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

import com.collabothon.back.categorization.consts.FactsConsts;
import com.collabothon.back.categorization.dto.ConfidenceGapDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.LessonVariantDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.enums.ConfidenceArea;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.LessonLang;
import com.collabothon.back.categorization.enums.LessonLevel;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;

class CategorizationRulesTests {

	/** The front seed customer (spec: `factsFrom` on the seed). */
	private static final FactsDto ALEX = new FactsDto("2-3.5k", "6+", "20%+", true, false, true, true);

	private static final FactsDto LENA = new FactsDto("<1k", "<1", "negative", false, true, false, false);

	private static final FactsDto TOM = new FactsDto("3.5-5k", "6+", "20%+", false, false, false, false);

	private static final Pattern ADVICE = Pattern
		.compile("\\b(should|must|consider|recommend|buy|sell|switch|invest in|open)\\b", Pattern.CASE_INSENSITIVE);

	private static OnboardingAnswersDto said(String experience) {
		return new OnboardingAnswersDto(null, List.of(), experience, false);
	}

	private static final OnboardingAnswersDto SKIPPED = new OnboardingAnswersDto(null, List.of(), null, true);

	private static void assertContains(List<ConfidenceGapDto> gaps, ConfidenceGapDto expected) {
		assertTrue(gaps.contains(expected), () -> expected + " not in " + gaps);
	}

	private static ConfidenceGapDto gap(ConfidenceArea area, GapDirection direction, String because) {
		return new ConfidenceGapDto(area, direction, because);
	}

	@Test
	void savingUnderWhenTheySayLittleButSaveEveryMonth() {
		assertContains(confidenceGaps(said("not-saving"), ALEX), gap(ConfidenceArea.SAVING, GapDirection.UNDER,
				"You said: I don't save yet. Money goes to savings or investments every month."));
		assertContains(confidenceGaps(said("occasional"), ALEX), gap(ConfidenceArea.SAVING, GapDirection.UNDER,
				"You said: I save now and then. Money goes to savings or investments every month."));
		assertEquals(List.of(), confidenceGaps(said("occasional"), TOM));
	}

	@Test
	void savingOverWhenTheySaySavingButHaveNoBuffer() {
		assertEquals(List.of(gap(ConfidenceArea.SAVING, GapDirection.OVER,
				"You said: I save regularly. Your accounts cover less than a month of spending.")),
				confidenceGaps(said("regular"), LENA));
		assertContains(confidenceGaps(said("investing"), LENA), gap(ConfidenceArea.SAVING, GapDirection.OVER,
				"You said: I save and invest. Your accounts cover less than a month of spending."));
		assertContains(confidenceGaps(said("planning"), LENA), gap(ConfidenceArea.SAVING, GapDirection.OVER,
				"You said: I plan my finances ahead. Your accounts cover less than a month of spending."));
		assertEquals(List.of(), confidenceGaps(said("occasional"), LENA));
	}

	@Test
	void investingUnderWhenTheyDoNotSayInvestingButHoldInvestments() {
		assertEquals(List.of(gap(ConfidenceArea.INVESTING, GapDirection.UNDER,
				"You said: I save regularly. Your accounts with us include investment products.")),
				confidenceGaps(said("regular"), ALEX));
		assertContains(confidenceGaps(said("not-saving"), ALEX), gap(ConfidenceArea.INVESTING, GapDirection.UNDER,
				"You said: I don't save yet. Your accounts with us include investment products."));
		assertEquals(List.of(), confidenceGaps(said("investing"), ALEX));
	}

	@Test
	void investingOverWhenTheySayInvestingButHoldNone() {
		assertEquals(List.of(gap(ConfidenceArea.INVESTING, GapDirection.OVER,
				"You said: I plan my finances ahead. No investment products in your accounts with us.")),
				confidenceGaps(said("planning"), TOM));
		assertEquals(List.of(gap(ConfidenceArea.INVESTING, GapDirection.OVER,
				"You said: I save and invest. No investment products in your accounts with us.")),
				confidenceGaps(said("investing"), TOM));
		assertEquals(List.of(), confidenceGaps(said("regular"), TOM));
	}

	@Test
	void noGapsWithoutBankDataOrAnExperienceAnswer() {
		assertEquals(List.of(), confidenceGaps(said("not-saving"), null));
		assertEquals(List.of(), confidenceGaps(SKIPPED, ALEX));
	}

	@Test
	void declarationDecidesTheFallbackRole() {
		assertEquals(Role.ADVANCED, fallbackRole(said("investing"), TOM));
		assertEquals(Role.ADVANCED, fallbackRole(said("planning"), null));
		assertEquals(Role.INTERMEDIATE, fallbackRole(said("regular"), LENA));
		assertEquals(Role.INTERMEDIATE, fallbackRole(said("occasional"), ALEX));
		assertEquals(Role.NOVICE, fallbackRole(said("occasional"), TOM));
		assertEquals(Role.NOVICE, fallbackRole(said("occasional"), null));
		assertEquals(Role.NOVICE, fallbackRole(said("not-saving"), ALEX));
		assertEquals(Role.NOVICE, fallbackRole(SKIPPED, ALEX));
	}

	@Test
	void fallbackFocusKeepsTheFixedOrder() {
		OnboardingAnswersDto goals = new OnboardingAnswersDto(null, List.of("insurance", "budget"), "not-saving",
				false);
		assertEquals(List.of(FocusArea.DEBT, FocusArea.SAVING, FocusArea.RISK), fallbackFocus(goals, LENA, Role.NOVICE));
		OnboardingAnswersDto laterLife = new OnboardingAnswersDto("later-life", List.of("stocks-etfs"), "planning",
				false);
		assertEquals(List.of(FocusArea.DEBT, FocusArea.RETIREMENT, FocusArea.INVESTING),
				fallbackFocus(laterLife, ALEX, Role.ADVANCED));
		assertEquals(List.of(FocusArea.RETIREMENT, FocusArea.INVESTING), fallbackFocus(laterLife, null, Role.ADVANCED));
		assertEquals(List.of(FocusArea.INVESTING), fallbackFocus(SKIPPED, TOM, Role.ADVANCED));
		assertEquals(List.of(FocusArea.SAVING), fallbackFocus(SKIPPED, null, Role.ADVANCED));
	}

	@Test
	void everyGoalOfMainsOnboardingPointsToAnArea() {
		List<String> goals = List.of("budget", "money-habits", "banking-basics", "start-saving", "emergency-fund",
				"inflation", "pay-off-debt", "credit-cards", "loans-mortgages", "start-investing", "stocks-etfs",
				"crypto", "retirement", "insurance", "scams");
		goals.forEach(goal -> assertEquals(1, FocusArea.fromGoals(List.of(goal)).size(), goal));
		assertEquals(List.of(FocusArea.INVESTING, FocusArea.RISK, FocusArea.SAVING),
				FocusArea.fromGoals(List.of("crypto", "scams", "budget", "stocks-etfs")));
	}

	@Test
	void focusFromNoulTakesTheTopAreaWhenNonePasses() {
		assertEquals(List.of(FocusArea.DEBT), focusFromNoul(Map.of(FocusArea.SAVING, 0.2, FocusArea.DEBT, 0.4,
				FocusArea.INVESTING, 0.3, FocusArea.RISK, 0.1, FocusArea.RETIREMENT, 0.0)));
		assertEquals(List.of(FocusArea.INVESTING, FocusArea.SAVING, FocusArea.RISK),
				focusFromNoul(Map.of(FocusArea.SAVING, 0.6, FocusArea.DEBT, 0.1, FocusArea.INVESTING, 0.9,
						FocusArea.RISK, 0.5, FocusArea.RETIREMENT, 0.0)));
	}

	@Test
	void lifeStageComesFromTheAnswerOnly() {
		assertEquals(Arrays.asList(LifeStage.STUDENT, LifeStage.FAMILY, LifeStage.ESTABLISHED, LifeStage.PRE_RETIREMENT,
				null),
				Arrays.asList("starting-out", "building", "settled", "later-life", null)
					.stream()
					.map(LifeStage::fromAnswer)
					.toList());
		assertThrows(IllegalArgumentException.class, () -> LifeStage.fromAnswer("student"));
	}

	@Test
	void lessonVariantFollowsTheRole() {
		assertEquals(new LessonVariantDto(LifeStage.FAMILY, LessonLevel.BEGINNER, LessonLang.PLAIN),
				lessonVariant(Role.NOVICE, LifeStage.FAMILY));
		assertEquals(new LessonVariantDto(null, LessonLevel.BEGINNER, LessonLang.STANDARD),
				lessonVariant(Role.INTERMEDIATE, LifeStage.ESTABLISHED));
		assertEquals(new LessonVariantDto(null, LessonLevel.ADVANCED, LessonLang.STANDARD),
				lessonVariant(Role.ADVANCED, null));
	}

	@Test
	void roleBecauseUsesTheAnswerAndTheHabits() {
		assertEquals(List.of("You said: I save now and then.", "Money goes to savings or investments every month.",
				"Your accounts with us include investment products."), roleBecause(said("occasional"), ALEX));
		assertEquals(List.of("You said: I save regularly.", "No regular transfers to savings or investments.",
				"No investment products in your accounts with us."), roleBecause(said("regular"), TOM));
		assertEquals(List.of(), roleBecause(SKIPPED, null));
	}

	@Test
	void focusBecauseListsOnlySupportingLines() {
		assertEquals(List.of("Your current account is below zero.", "Your accounts cover less than a month of spending.",
				"You spent more than you earned this month.", NEUTRAL_LINE),
				focusBecause(List.of(FocusArea.DEBT, FocusArea.SAVING, FocusArea.RISK), SKIPPED, LENA));
		OnboardingAnswersDto laterLife = new OnboardingAnswersDto("later-life", List.of("stocks-etfs"), null, false);
		assertEquals(List.of("You said retirement is close or already here.",
				"Your accounts cover more than 6 months of spending.", "You picked investing as a goal.",
				"You are paying off a loan with us.", "Your accounts with us include investment products."),
				focusBecause(List.of(FocusArea.RETIREMENT, FocusArea.INVESTING, FocusArea.DEBT, FocusArea.RISK),
						laterLife, ALEX));
		assertEquals(List.of("You said retirement is close or already here.", NEUTRAL_LINE),
				focusBecause(List.of(FocusArea.RETIREMENT, FocusArea.SAVING), laterLife, null));
	}

	@Test
	void everyBufferBandHasALine() {
		assertEquals(Set.of(FactsConsts.BUFFER_UNDER_1, FactsConsts.BUFFER_1_3, FactsConsts.BUFFER_3_6,
				FactsConsts.BUFFER_6_PLUS), BUFFER.keySet());
	}

	@Test
	void linesAreObservations() {
		List<String> lines = new ArrayList<>();
		for (FactsDto facts : Arrays.asList(ALEX, LENA, TOM, null)) {
			for (String experience : Arrays.asList("not-saving", "occasional", "regular", "investing", "planning",
					null)) {
				OnboardingAnswersDto a = new OnboardingAnswersDto("later-life", List.of("stocks-etfs", "insurance",
						"retirement"), experience, false);
				lines.addAll(roleBecause(a, facts));
				lines.addAll(focusBecause(List.of(FocusArea.values()), a, facts));
				confidenceGaps(a, facts).forEach(gap -> lines.add(gap.because()));
			}
		}
		assertFalse(lines.isEmpty());
		lines.forEach(line -> assertFalse(ADVICE.matcher(line).find(), line));
	}

}
