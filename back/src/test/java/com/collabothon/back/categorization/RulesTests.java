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

import com.collabothon.back.bank.Facts;
import com.collabothon.back.categorization.Categorization.Confidence;
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

	private static final Facts LENA = new Facts("18-25", "<1k", "<1", "negative", false, 2, false, false, false);

	private static final Facts TOM = new Facts("26-34", "3.5-5k", "6+", "20%+", false, 0, false, false, false);

	private static final Facts MARCO = new Facts("35-44", "3.5-5k", "1-3", "0-10%", true, 0, false, true, false);

	private static final Facts INGRID = new Facts("55-64", "3.5-5k", "6+", "20%+", true, 0, true, false, true);

	private static final Pattern ADVICE = Pattern
		.compile("\\b(should|must|consider|recommend|buy|sell|switch|invest in|open)\\b", Pattern.CASE_INSENSITIVE);

	private static OnboardingAnswers rated(String experience, Integer budgeting, Integer saving, Integer investing) {
		return new OnboardingAnswers(null, List.of(), experience, null, new Confidence(budgeting, saving, investing),
				false);
	}

	private static final OnboardingAnswers SKIPPED = new OnboardingAnswers(null, List.of(), null, null,
			new Confidence(null, null, null), true);

	@Test
	void budgetingGap() {
		assertThat(confidenceGaps(rated(null, 2, null, null), TOM)).containsExactly(new ConfidenceGap(
				ConfidenceArea.BUDGETING, Direction.UNDER,
				"You rate yourself 2/5 on everyday money, and your current account stayed above zero in the last 3 months"
						+ " while you kept more than 20% of your income."));
		assertThat(confidenceGaps(rated(null, 4, null, null), LENA)).containsExactly(new ConfidenceGap(
				ConfidenceArea.BUDGETING, Direction.OVER,
				"You rate yourself 4/5 on everyday money, and your current account went below zero in 2 of the last 3"
						+ " months."));
		assertThat(confidenceGaps(rated(null, 3, null, null), LENA)).isEmpty();
		assertThat(confidenceGaps(rated(null, 2, null, null), LENA)).isEmpty();
	}

	@Test
	void savingGap() {
		assertThat(confidenceGaps(rated(null, null, 1, null), INGRID)).containsExactly(new ConfidenceGap(
				ConfidenceArea.SAVING, Direction.UNDER,
				"You rate yourself 1/5 on saving, and you moved money to savings in most of the last 3 months."));
		assertThat(confidenceGaps(rated(null, null, 5, null), LENA)).containsExactly(new ConfidenceGap(
				ConfidenceArea.SAVING, Direction.OVER,
				"You rate yourself 5/5 on saving, and your accounts cover less than a month of spending."));
		assertThat(confidenceGaps(rated(null, null, 4, null), TOM)).isEmpty();
	}

	@Test
	void investingGap() {
		assertThat(confidenceGaps(rated("regular", null, null, 2), INGRID)).containsExactly(new ConfidenceGap(
				ConfidenceArea.INVESTING, Direction.UNDER,
				"You rate yourself 2/5 on investing, and your accounts with us include investment products."));
		assertThat(confidenceGaps(rated("not-saving", null, null, 4), TOM)).containsExactly(new ConfidenceGap(
				ConfidenceArea.INVESTING, Direction.OVER,
				"You rate yourself 4/5 on investing, and there are no investment products in your accounts with us."));
		assertThat(confidenceGaps(rated("tried", null, null, 5), TOM)).isEmpty();
	}

	@Test
	void noGapsWithoutBankDataOrRating() {
		assertThat(confidenceGaps(rated("none", 1, 5, 5), null)).isEmpty();
		assertThat(confidenceGaps(rated("none", null, null, null), LENA)).isEmpty();
	}

	@Test
	void declarationDecidesTheFallbackRole() {
		assertThat(Rules.fallbackRole(rated("experienced", null, null, null), null)).isEqualTo(Role.ADVANCED);
		assertThat(Rules.fallbackRole(rated("regular", null, null, null), TOM)).isEqualTo(Role.ADVANCED);
		assertThat(Rules.fallbackRole(rated("tried", null, null, null), LENA)).isEqualTo(Role.INTERMEDIATE);
		assertThat(Rules.fallbackRole(rated(null, null, null, null), INGRID)).isEqualTo(Role.INTERMEDIATE);
		assertThat(Rules.fallbackRole(rated("none", null, null, null), TOM)).isEqualTo(Role.NOVICE);
	}

	@Test
	void fallbackFocusKeepsTheFixedOrder() {
		OnboardingAnswers goals = new OnboardingAnswers(null, List.of("insurance", "taxes", "budget"), "not-saving",
				null, new Confidence(null, null, null), false);
		assertThat(Rules.fallbackFocus(goals, LENA, Role.NOVICE)).containsExactly(Area.DEBT, Area.SAVING, Area.RISK);
		assertThat(Rules.fallbackFocus(SKIPPED, INGRID, Role.ADVANCED)).containsExactly(Area.RETIREMENT);
		assertThat(Rules.fallbackFocus(SKIPPED, null, Role.ADVANCED)).containsExactly(Area.SAVING);
	}

	@Test
	void focusFromNoulTakesTheTopAreaWhenNonePasses() {
		assertThat(Rules.focusFromNoul(Map.of(Area.SAVING, 0.2, Area.DEBT, 0.4, Area.INVESTING, 0.3, Area.RISK, 0.1,
				Area.RETIREMENT, 0.0))).containsExactly(Area.DEBT);
		assertThat(Rules.focusFromNoul(Map.of(Area.SAVING, 0.6, Area.DEBT, 0.1, Area.INVESTING, 0.9, Area.RISK, 0.5,
				Area.RETIREMENT, 0.0))).containsExactly(Area.INVESTING, Area.SAVING, Area.RISK);
	}

	@Test
	void lessonVariant() {
		assertThat(Rules.lessonVariant(Role.NOVICE, LifeStage.FAMILY, null))
			.isEqualTo(new LessonVariant(LifeStage.FAMILY, Level.BEGINNER, Lang.PLAIN));
		assertThat(Rules.lessonVariant(Role.NOVICE, LifeStage.ESTABLISHED, "detailed"))
			.isEqualTo(new LessonVariant(null, Level.BEGINNER, Lang.STANDARD));
		assertThat(Rules.lessonVariant(Role.ADVANCED, null, "simple"))
			.isEqualTo(new LessonVariant(null, Level.ADVANCED, Lang.PLAIN));
	}

	@Test
	void lifeStageFromEveryAgeBand() {
		assertThat(Facts.AGE_BANDS.stream().map(Rules::lifeStageFromAge)).containsExactly(LifeStage.STUDENT,
				LifeStage.ESTABLISHED, LifeStage.FAMILY, LifeStage.FAMILY, LifeStage.PRE_RETIREMENT,
				LifeStage.PRE_RETIREMENT);
		assertThatThrownBy(() -> Rules.lifeStageFromAge("75+")).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void lifeStageBecauseNamesTheMortgage() {
		assertThat(Rules.lifeStageBecause(MARCO)).containsExactly("Age group 35-44.", "You are paying off a mortgage.");
		assertThat(Rules.lifeStageBecause(TOM)).containsExactly("Age group 26-34.");
	}

	@Test
	void focusBecauseListsOnlySupportingLines() {
		assertThat(Rules.focusBecause(List.of(Area.DEBT, Area.SAVING, Area.RISK), SKIPPED, LENA)).containsExactly(
				"Your current account went below zero in 2 of the last 3 months.",
				"Your accounts cover less than a month of spending.", "You spent more than you earned.",
				Rules.NEUTRAL_LINE);
		OnboardingAnswers investingGoal = new OnboardingAnswers(null, List.of("etfs"), null, null,
				new Confidence(null, null, null), false);
		assertThat(Rules.focusBecause(List.of(Area.SAVING, Area.INVESTING), investingGoal, TOM)).containsExactly(
				Rules.NEUTRAL_LINE, "No investment products in your accounts with us.",
				"Your accounts cover more than 6 months of spending.", "You picked investing as a goal.");
	}

	@Test
	void everyBufferBandHasALine() {
		assertThat(Rules.BUFFER.keySet()).isEqualTo(Set.copyOf(Facts.CASH_BUFFER_BANDS));
	}

	@Test
	void linesAreObservations() {
		List<String> lines = new ArrayList<>();
		List<String> experiences = new ArrayList<>(Arrays.asList("not-saving", "none", "tried", "regular",
				"experienced", null));
		for (Facts facts : Arrays.asList(LENA, TOM, MARCO, INGRID, null)) {
			for (String experience : experiences) {
				for (int confidence : List.of(1, 5)) {
					OnboardingAnswers a = new OnboardingAnswers(null, List.of("etfs", "insurance", "retirement"),
							experience, null, new Confidence(confidence, confidence, confidence), false);
					lines.addAll(Rules.roleBecause(a, facts));
					lines.addAll(Rules.focusBecause(List.of(Area.values()), a, facts));
					confidenceGaps(a, facts).forEach(gap -> lines.add(gap.because()));
				}
			}
			if (facts != null) {
				lines.addAll(Rules.lifeStageBecause(facts));
			}
		}
		assertThat(lines).isNotEmpty().noneMatch(line -> ADVICE.matcher(line).find());
	}

}
