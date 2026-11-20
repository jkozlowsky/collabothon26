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

import com.collabothon.back.categorization.Categorization.ConfidenceArea;
import com.collabothon.back.categorization.Categorization.ConfidenceGap;
import com.collabothon.back.categorization.Categorization.Direction;
import com.collabothon.back.categorization.Categorization.Lang;
import com.collabothon.back.categorization.Categorization.LessonVariant;
import com.collabothon.back.categorization.Categorization.Level;
import com.collabothon.back.categorization.Categorization.LifeStage;
import com.collabothon.back.categorization.Categorization.OnboardingAnswers;
import com.collabothon.back.categorization.Categorization.Role;

class RulesTests {

	/** The front seed customer (spec: `factsFrom` on the seed). */
	private static final Facts ALEX = new Facts("2-3.5k", "6+", "20%+", true, false, true, true);

	private static final Facts LENA = new Facts("<1k", "<1", "negative", false, true, false, false);

	private static final Facts TOM = new Facts("3.5-5k", "6+", "20%+", false, false, false, false);

	private static final Pattern ADVICE = Pattern
		.compile("\\b(should|must|consider|recommend|buy|sell|switch|invest in|open)\\b", Pattern.CASE_INSENSITIVE);

	private static OnboardingAnswers said(String experience) {
		return new OnboardingAnswers(null, List.of(), experience, false);
	}

	private static final OnboardingAnswers SKIPPED = new OnboardingAnswers(null, List.of(), null, true);

	private static ConfidenceGap gap(ConfidenceArea area, Direction direction, String because) {
		return new ConfidenceGap(area, direction, because);
	}

	@Test
	void savingUnderWhenTheySayLittleButSaveEveryMonth() {
		assertThat(confidenceGaps(said("not-saving"), ALEX)).contains(gap(ConfidenceArea.SAVING, Direction.UNDER,
				"You said: I don't save yet. Money goes to savings or investments every month."));
		assertThat(confidenceGaps(said("occasional"), ALEX)).contains(gap(ConfidenceArea.SAVING, Direction.UNDER,
				"You said: I save now and then. Money goes to savings or investments every month."));
		assertThat(confidenceGaps(said("occasional"), TOM)).isEmpty();
	}

	@Test
	void savingOverWhenTheySaySavingButHaveNoBuffer() {
		assertThat(confidenceGaps(said("regular"), LENA)).containsExactly(gap(ConfidenceArea.SAVING, Direction.OVER,
				"You said: I save regularly. Your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(said("investing"), LENA)).contains(gap(ConfidenceArea.SAVING, Direction.OVER,
				"You said: I save and invest. Your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(said("planning"), LENA)).contains(gap(ConfidenceArea.SAVING, Direction.OVER,
				"You said: I plan my finances ahead. Your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(said("occasional"), LENA)).isEmpty();
	}

	@Test
	void investingUnderWhenTheyDoNotSayInvestingButHoldInvestments() {
		assertThat(confidenceGaps(said("regular"), ALEX)).containsExactly(gap(ConfidenceArea.INVESTING,
				Direction.UNDER, "You said: I save regularly. Your accounts with us include investment products."));
		assertThat(confidenceGaps(said("not-saving"), ALEX)).contains(gap(ConfidenceArea.INVESTING, Direction.UNDER,
				"You said: I don't save yet. Your accounts with us include investment products."));
		assertThat(confidenceGaps(said("investing"), ALEX)).isEmpty();
	}

	@Test
	void investingOverWhenTheySayInvestingButHoldNone() {
		assertThat(confidenceGaps(said("planning"), TOM)).containsExactly(gap(ConfidenceArea.INVESTING,
				Direction.OVER, "You said: I plan my finances ahead. No investment products in your accounts with us."));
		assertThat(confidenceGaps(said("investing"), TOM)).containsExactly(gap(ConfidenceArea.INVESTING,
				Direction.OVER, "You said: I save and invest. No investment products in your accounts with us."));
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
		OnboardingAnswers goals = new OnboardingAnswers(null, List.of("insurance", "budget"), "not-saving", false);
		assertThat(Rules.fallbackFocus(goals, LENA, Role.NOVICE)).containsExactly(Area.DEBT, Area.SAVING, Area.RISK);
		OnboardingAnswers laterLife = new OnboardingAnswers("later-life", List.of("stocks-etfs"), "planning", false);
		assertThat(Rules.fallbackFocus(laterLife, ALEX, Role.ADVANCED)).containsExactly(Area.DEBT, Area.RETIREMENT,
				Area.INVESTING);
		assertThat(Rules.fallbackFocus(laterLife, null, Role.ADVANCED)).containsExactly(Area.RETIREMENT,
				Area.INVESTING);
		assertThat(Rules.fallbackFocus(SKIPPED, TOM, Role.ADVANCED)).containsExactly(Area.INVESTING);
		assertThat(Rules.fallbackFocus(SKIPPED, null, Role.ADVANCED)).containsExactly(Area.SAVING);
	}

	@Test
	void everyGoalOfMainsOnboardingPointsToAnArea() {
		List<String> goals = List.of("budget", "money-habits", "banking-basics", "start-saving", "emergency-fund",
				"inflation", "pay-off-debt", "credit-cards", "loans-mortgages", "start-investing", "stocks-etfs",
				"crypto", "retirement", "insurance", "scams");
		assertThat(goals).allSatisfy(goal -> assertThat(Area.fromGoals(List.of(goal))).hasSize(1));
		assertThat(Area.fromGoals(List.of("crypto", "scams", "budget", "stocks-etfs")))
			.containsExactly(Area.INVESTING, Area.RISK, Area.SAVING);
	}

	@Test
	void focusFromNoulTakesTheTopAreaWhenNonePasses() {
		assertThat(Rules.focusFromNoul(Map.of(Area.SAVING, 0.2, Area.DEBT, 0.4, Area.INVESTING, 0.3, Area.RISK, 0.1,
				Area.RETIREMENT, 0.0))).containsExactly(Area.DEBT);
		assertThat(Rules.focusFromNoul(Map.of(Area.SAVING, 0.6, Area.DEBT, 0.1, Area.INVESTING, 0.9, Area.RISK, 0.5,
				Area.RETIREMENT, 0.0))).containsExactly(Area.INVESTING, Area.SAVING, Area.RISK);
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
			.isEqualTo(new LessonVariant(LifeStage.FAMILY, Level.BEGINNER, Lang.PLAIN));
		assertThat(Rules.lessonVariant(Role.INTERMEDIATE, LifeStage.ESTABLISHED))
			.isEqualTo(new LessonVariant(null, Level.BEGINNER, Lang.STANDARD));
		assertThat(Rules.lessonVariant(Role.ADVANCED, null))
			.isEqualTo(new LessonVariant(null, Level.ADVANCED, Lang.STANDARD));
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
		assertThat(Rules.focusBecause(List.of(Area.DEBT, Area.SAVING, Area.RISK), SKIPPED, LENA)).containsExactly(
				"Your current account is below zero.", "Your accounts cover less than a month of spending.",
				"You spent more than you earned this month.", Rules.NEUTRAL_LINE);
		OnboardingAnswers laterLife = new OnboardingAnswers("later-life", List.of("stocks-etfs"), null, false);
		assertThat(Rules.focusBecause(List.of(Area.RETIREMENT, Area.INVESTING, Area.DEBT, Area.RISK), laterLife, ALEX))
			.containsExactly("You said retirement is close or already here.",
					"Your accounts cover more than 6 months of spending.", "You picked investing as a goal.",
					"You are paying off a loan with us.", "Your accounts with us include investment products.");
		assertThat(Rules.focusBecause(List.of(Area.RETIREMENT, Area.SAVING), laterLife, null))
			.containsExactly("You said retirement is close or already here.", Rules.NEUTRAL_LINE);
	}

	@Test
	void everyBufferBandHasALine() {
		assertThat(Rules.BUFFER.keySet()).isEqualTo(Set.of(Facts.BUFFER_UNDER_1, Facts.BUFFER_1_3, Facts.BUFFER_3_6,
				Facts.BUFFER_6_PLUS));
	}

	@Test
	void linesAreObservations() {
		List<String> lines = new ArrayList<>();
		for (Facts facts : Arrays.asList(ALEX, LENA, TOM, null)) {
			for (String experience : Arrays.asList("not-saving", "occasional", "regular", "investing", "planning",
					null)) {
				OnboardingAnswers a = new OnboardingAnswers("later-life", List.of("stocks-etfs", "insurance",
						"retirement"), experience, false);
				lines.addAll(Rules.roleBecause(a, facts));
				lines.addAll(Rules.focusBecause(List.of(Area.values()), a, facts));
				confidenceGaps(a, facts).forEach(gap -> lines.add(gap.because()));
			}
		}
		assertThat(lines).isNotEmpty().noneMatch(line -> ADVICE.matcher(line).find());
	}

}
