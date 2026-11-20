package com.collabothon.back.categorization;

import static com.collabothon.back.categorization.Rules.confidenceGaps;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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


class RulesTests {

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

	private static ConfidenceGapDto gap(ConfidenceArea area, GapDirection direction, String because) {
		return new ConfidenceGapDto(area, direction, because);
	}

	@Test
	void savingUnderWhenTheySayLittleButSaveEveryMonth() {
		assertThat(confidenceGaps(said("not-saving"), ALEX)).contains(gap(ConfidenceArea.SAVING, GapDirection.UNDER,
				"You said: I don't save yet. Money goes to savings or investments every month."));
		assertThat(confidenceGaps(said("occasional"), ALEX)).contains(gap(ConfidenceArea.SAVING, GapDirection.UNDER,
				"You said: I save now and then. Money goes to savings or investments every month."));
		assertThat(confidenceGaps(said("occasional"), TOM)).isEmpty();
	}

	@Test
	void savingOverWhenTheySaySavingButHaveNoBuffer() {
		assertThat(confidenceGaps(said("regular"), LENA)).containsExactly(gap(ConfidenceArea.SAVING, GapDirection.OVER,
				"You said: I save regularly. Your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(said("investing"), LENA)).contains(gap(ConfidenceArea.SAVING, GapDirection.OVER,
				"You said: I save and invest. Your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(said("planning"), LENA)).contains(gap(ConfidenceArea.SAVING, GapDirection.OVER,
				"You said: I plan my finances ahead. Your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(said("occasional"), LENA)).isEmpty();
	}

	@Test
	void investingUnderWhenTheyDoNotSayInvestingButHoldInvestments() {
		assertThat(confidenceGaps(said("regular"), ALEX)).containsExactly(gap(ConfidenceArea.INVESTING,
				GapDirection.UNDER, "You said: I save regularly. Your accounts with us include investment products."));
		assertThat(confidenceGaps(said("not-saving"), ALEX)).contains(gap(ConfidenceArea.INVESTING, GapDirection.UNDER,
				"You said: I don't save yet. Your accounts with us include investment products."));
		assertThat(confidenceGaps(said("investing"), ALEX)).isEmpty();
	}

	@Test
	void investingOverWhenTheySayInvestingButHoldNone() {
		assertThat(confidenceGaps(said("planning"), TOM)).containsExactly(gap(ConfidenceArea.INVESTING,
				GapDirection.OVER, "You said: I plan my finances ahead. No investment products in your accounts with us."));
		assertThat(confidenceGaps(said("investing"), TOM)).containsExactly(gap(ConfidenceArea.INVESTING,
				GapDirection.OVER, "You said: I save and invest. No investment products in your accounts with us."));
		assertThat(confidenceGaps(said("regular"), TOM)).isEmpty();
	}

	@Test
	void noGapsWithoutBankDataOrAnExperienceAnswer() {
		assertThat(confidenceGaps(said("not-saving"), null)).isEmpty();
		assertThat(confidenceGaps(SKIPPED, ALEX)).isEmpty();
	}

	@Test
	void declarationDecidesTheFallbackRole() {
		assertThat(Rules.fallbackRole(said("investing"), TOM)).isEqualTo(Role.ADVANCED);
		assertThat(Rules.fallbackRole(said("planning"), null)).isEqualTo(Role.ADVANCED);
		assertThat(Rules.fallbackRole(said("regular"), LENA)).isEqualTo(Role.INTERMEDIATE);
		assertThat(Rules.fallbackRole(said("occasional"), ALEX)).isEqualTo(Role.INTERMEDIATE);
		assertThat(Rules.fallbackRole(said("occasional"), TOM)).isEqualTo(Role.NOVICE);
		assertThat(Rules.fallbackRole(said("occasional"), null)).isEqualTo(Role.NOVICE);
		assertThat(Rules.fallbackRole(said("not-saving"), ALEX)).isEqualTo(Role.NOVICE);
		assertThat(Rules.fallbackRole(SKIPPED, ALEX)).isEqualTo(Role.NOVICE);
	}

	@Test
	void fallbackFocusKeepsTheFixedOrder() {
		OnboardingAnswersDto goals = new OnboardingAnswersDto(null, List.of("insurance", "budget"), "not-saving", false);
		assertThat(Rules.fallbackFocus(goals, LENA, Role.NOVICE)).containsExactly(FocusArea.DEBT, FocusArea.SAVING, FocusArea.RISK);
		OnboardingAnswersDto laterLife = new OnboardingAnswersDto("later-life", List.of("stocks-etfs"), "planning", false);
		assertThat(Rules.fallbackFocus(laterLife, ALEX, Role.ADVANCED)).containsExactly(FocusArea.DEBT, FocusArea.RETIREMENT,
				FocusArea.INVESTING);
		assertThat(Rules.fallbackFocus(laterLife, null, Role.ADVANCED)).containsExactly(FocusArea.RETIREMENT,
				FocusArea.INVESTING);
		assertThat(Rules.fallbackFocus(SKIPPED, TOM, Role.ADVANCED)).containsExactly(FocusArea.INVESTING);
		assertThat(Rules.fallbackFocus(SKIPPED, null, Role.ADVANCED)).containsExactly(FocusArea.SAVING);
	}

	@Test
	void everyGoalOfMainsOnboardingPointsToAnArea() {
		List<String> goals = List.of("budget", "money-habits", "banking-basics", "start-saving", "emergency-fund",
				"inflation", "pay-off-debt", "credit-cards", "loans-mortgages", "start-investing", "stocks-etfs",
				"crypto", "retirement", "insurance", "scams");
		assertThat(goals).allSatisfy(goal -> assertThat(FocusArea.fromGoals(List.of(goal))).hasSize(1));
		assertThat(FocusArea.fromGoals(List.of("crypto", "scams", "budget", "stocks-etfs")))
			.containsExactly(FocusArea.INVESTING, FocusArea.RISK, FocusArea.SAVING);
	}

	@Test
	void focusFromNoulTakesTheTopAreaWhenNonePasses() {
		assertThat(Rules.focusFromNoul(Map.of(FocusArea.SAVING, 0.2, FocusArea.DEBT, 0.4, FocusArea.INVESTING, 0.3, FocusArea.RISK, 0.1,
				FocusArea.RETIREMENT, 0.0))).containsExactly(FocusArea.DEBT);
		assertThat(Rules.focusFromNoul(Map.of(FocusArea.SAVING, 0.6, FocusArea.DEBT, 0.1, FocusArea.INVESTING, 0.9, FocusArea.RISK, 0.5,
				FocusArea.RETIREMENT, 0.0))).containsExactly(FocusArea.INVESTING, FocusArea.SAVING, FocusArea.RISK);
	}

	@Test
	void lifeStageComesFromTheAnswerOnly() {
		assertThat(Arrays.asList("starting-out", "building", "settled", "later-life", null).stream()
			.map(LifeStage::fromAnswer)).containsExactly(LifeStage.STUDENT, LifeStage.FAMILY, LifeStage.ESTABLISHED,
					LifeStage.PRE_RETIREMENT, null);
		assertThatThrownBy(() -> LifeStage.fromAnswer("student")).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void lessonVariantFollowsTheRole() {
		assertThat(Rules.lessonVariant(Role.NOVICE, LifeStage.FAMILY))
			.isEqualTo(new LessonVariantDto(LifeStage.FAMILY, LessonLevel.BEGINNER, LessonLang.PLAIN));
		assertThat(Rules.lessonVariant(Role.INTERMEDIATE, LifeStage.ESTABLISHED))
			.isEqualTo(new LessonVariantDto(null, LessonLevel.BEGINNER, LessonLang.STANDARD));
		assertThat(Rules.lessonVariant(Role.ADVANCED, null))
			.isEqualTo(new LessonVariantDto(null, LessonLevel.ADVANCED, LessonLang.STANDARD));
	}

	@Test
	void roleBecauseUsesTheAnswerAndTheHabits() {
		assertThat(Rules.roleBecause(said("occasional"), ALEX)).containsExactly("You said: I save now and then.",
				"Money goes to savings or investments every month.",
				"Your accounts with us include investment products.");
		assertThat(Rules.roleBecause(said("regular"), TOM)).containsExactly("You said: I save regularly.",
				"No regular transfers to savings or investments.", "No investment products in your accounts with us.");
		assertThat(Rules.roleBecause(SKIPPED, null)).isEmpty();
	}

	@Test
	void focusBecauseListsOnlySupportingLines() {
		assertThat(Rules.focusBecause(List.of(FocusArea.DEBT, FocusArea.SAVING, FocusArea.RISK), SKIPPED, LENA)).containsExactly(
				"Your current account is below zero.", "Your accounts cover less than a month of spending.",
				"You spent more than you earned this month.", Rules.NEUTRAL_LINE);
		OnboardingAnswersDto laterLife = new OnboardingAnswersDto("later-life", List.of("stocks-etfs"), null, false);
		assertThat(Rules.focusBecause(List.of(FocusArea.RETIREMENT, FocusArea.INVESTING, FocusArea.DEBT, FocusArea.RISK), laterLife, ALEX))
			.containsExactly("You said retirement is close or already here.",
					"Your accounts cover more than 6 months of spending.", "You picked investing as a goal.",
					"You are paying off a loan with us.", "Your accounts with us include investment products.");
		assertThat(Rules.focusBecause(List.of(FocusArea.RETIREMENT, FocusArea.SAVING), laterLife, null))
			.containsExactly("You said retirement is close or already here.", Rules.NEUTRAL_LINE);
	}

	@Test
	void everyBufferBandHasALine() {
		assertThat(Rules.BUFFER.keySet()).isEqualTo(Set.of(FactsConsts.BUFFER_UNDER_1, FactsConsts.BUFFER_1_3, FactsConsts.BUFFER_3_6,
				FactsConsts.BUFFER_6_PLUS));
	}

	@Test
	void linesAreObservations() {
		List<String> lines = new ArrayList<>();
		for (FactsDto facts : Arrays.asList(ALEX, LENA, TOM, null)) {
			for (String experience : Arrays.asList("not-saving", "occasional", "regular", "investing", "planning",
					null)) {
				OnboardingAnswersDto a = new OnboardingAnswersDto("later-life", List.of("stocks-etfs", "insurance",
						"retirement"), experience, false);
				lines.addAll(Rules.roleBecause(a, facts));
				lines.addAll(Rules.focusBecause(List.of(FocusArea.values()), a, facts));
				confidenceGaps(a, facts).forEach(gap -> lines.add(gap.because()));
			}
		}
		assertThat(lines).isNotEmpty().noneMatch(line -> ADVICE.matcher(line).find());
	}

}
