package com.collabothon.back.categorization;

import static com.collabothon.back.categorization.Facts.BUFFER_1_3;
import static com.collabothon.back.categorization.Facts.BUFFER_3_6;
import static com.collabothon.back.categorization.Facts.BUFFER_6_PLUS;
import static com.collabothon.back.categorization.Facts.BUFFER_UNDER_1;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import com.collabothon.back.categorization.Categorization.ConfidenceArea;
import com.collabothon.back.categorization.Categorization.ConfidenceGap;
import com.collabothon.back.categorization.Categorization.Direction;
import com.collabothon.back.categorization.Categorization.Lang;
import com.collabothon.back.categorization.Categorization.LessonVariant;
import com.collabothon.back.categorization.Categorization.Level;
import com.collabothon.back.categorization.Categorization.LifeStage;
import com.collabothon.back.categorization.Categorization.OnboardingAnswers;
import com.collabothon.back.categorization.Categorization.Role;

import lombok.RequiredArgsConstructor;

final class Rules {

	static final double FOCUS_THRESHOLD = 0.5;

	static final String NEUTRAL_LINE = "It fits the answers you gave.";

	static final String SAVES_LINE = "Money goes to savings or investments every month.";

	static final String NO_SAVES_LINE = "No regular transfers to savings or investments.";

	static final String HOLDS_LINE = "Your accounts with us include investment products.";

	static final String NO_HOLDS_LINE = "No investment products in your accounts with us.";

	static final String OVERSPENT_LINE = "You spent more than you earned this month.";

	static final String OVERDRAFT_LINE = "Your current account is below zero.";

	static final String LOAN_LINE = "You are paying off a loan with us.";

	static final String RETIREMENT_LINE = "You said retirement is close or already here.";

	static final Map<String, String> BUFFER = Map.of(BUFFER_UNDER_1, "less than a month", BUFFER_1_3,
			"1 to 3 months", BUFFER_3_6, "3 to 6 months", BUFFER_6_PLUS, "more than 6 months");

	private static final Set<String> SHORT_BUFFER = Set.of(BUFFER_UNDER_1, BUFFER_1_3);

	/** Main's onboarding answers to "How do you handle money today?", with their titles. */
	@RequiredArgsConstructor
	enum Experience {

		NOT_SAVING("I don't save yet"), OCCASIONAL("I save now and then"), REGULAR("I save regularly"),
		INVESTING("I save and invest"), PLANNING("I plan my finances ahead");

		private final String label;

		static Experience fromWire(String value) {
			return value == null ? null : Arrays.stream(values())
				.filter(e -> Categorization.wireName(e).equals(value))
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Unknown experience: " + value));
		}

		String saidLine() {
			return "You said: " + label + ".";
		}

	}

	private static final Set<Experience> SAYS_LITTLE_SAVING = EnumSet.of(Experience.NOT_SAVING,
			Experience.OCCASIONAL);

	private static final Set<Experience> SAYS_INVESTING = EnumSet.of(Experience.INVESTING, Experience.PLANNING);

	record Judgement(Role role, Map<String, Double> roleProbabilities, List<Area> focusAreas,
			Map<String, Double> focusProbabilities, String model) {
	}

	private Rules() {
	}

	static Judgement fallback(OnboardingAnswers a, Facts f) {
		Role role = fallbackRole(a, f);
		return new Judgement(role, Map.of(), fallbackFocus(a, f, role), Map.of(), null);
	}

	/** The declaration decides; facts only lift someone who saves now and then but does so every month. */
	static Role fallbackRole(OnboardingAnswers a, Facts f) {
		return switch (Experience.fromWire(a.experience())) {
			case INVESTING, PLANNING -> Role.ADVANCED;
			case REGULAR -> Role.INTERMEDIATE;
			case OCCASIONAL -> f != null && f.savesRegularly() ? Role.INTERMEDIATE : Role.NOVICE;
			case NOT_SAVING -> Role.NOVICE;
			case null -> Role.NOVICE;
		};
	}

	static List<Area> fallbackFocus(OnboardingAnswers a, Facts f, Role role) {
		Set<Area> areas = new LinkedHashSet<>();
		if (f != null) {
			if (f.inOverdraft() || f.hasLoan()) {
				areas.add(Area.DEBT);
			}
			if (hasShortBuffer(f)) {
				areas.add(Area.SAVING);
			}
			if (!f.holdsInvestments() && f.cashBufferMonths().equals(BUFFER_6_PLUS)) {
				areas.add(Area.INVESTING);
			}
		}
		if (LifeStage.fromAnswer(a.lifeStage()) == LifeStage.PRE_RETIREMENT) {
			areas.add(Area.RETIREMENT);
		}
		if (role == Role.NOVICE) {
			areas.add(Area.RISK);
		}
		areas.addAll(Area.fromGoals(a.goals()));
		return areas.isEmpty() ? List.of(Area.SAVING) : List.copyOf(areas);
	}

	/** Areas at or above the threshold, most likely first; none passes → the single most likely one. */
	static List<Area> focusFromNoul(Map<Area, Double> noul) {
		List<Area> sorted = Arrays.stream(Area.values()).sorted(Comparator.comparing(noul::get).reversed()).toList();
		List<Area> picked = sorted.stream().filter(area -> noul.get(area) >= FOCUS_THRESHOLD).toList();
		return picked.isEmpty() ? sorted.subList(0, 1) : picked;
	}

	/** Where what the user said about themselves and what their accounts show point different ways. */
	static List<ConfidenceGap> confidenceGaps(OnboardingAnswers a, Facts f) {
		Experience said = Experience.fromWire(a.experience());
		if (f == null || said == null) {
			return List.of();
		}
		List<ConfidenceGap> gaps = new ArrayList<>();
		if (SAYS_LITTLE_SAVING.contains(said) && f.savesRegularly()) {
			gaps.add(gap(ConfidenceArea.SAVING, Direction.UNDER, said, SAVES_LINE));
		}
		else if (!SAYS_LITTLE_SAVING.contains(said) && f.cashBufferMonths().equals(BUFFER_UNDER_1)) {
			gaps.add(gap(ConfidenceArea.SAVING, Direction.OVER, said, bufferLine(f)));
		}
		if (!SAYS_INVESTING.contains(said) && f.holdsInvestments()) {
			gaps.add(gap(ConfidenceArea.INVESTING, Direction.UNDER, said, HOLDS_LINE));
		}
		else if (SAYS_INVESTING.contains(said) && !f.holdsInvestments()) {
			gaps.add(gap(ConfidenceArea.INVESTING, Direction.OVER, said, NO_HOLDS_LINE));
		}
		return gaps;
	}

	private static ConfidenceGap gap(ConfidenceArea area, Direction direction, Experience said, String shows) {
		return new ConfidenceGap(area, direction, said.saidLine() + " " + shows);
	}

	static LessonVariant lessonVariant(Role role, LifeStage lifeStage) {
		LifeStage persona = lifeStage == LifeStage.ESTABLISHED ? null : lifeStage;
		return new LessonVariant(persona, role == Role.ADVANCED ? Level.ADVANCED : Level.BEGINNER,
				role == Role.NOVICE ? Lang.PLAIN : Lang.STANDARD);
	}

	static List<String> roleBecause(OnboardingAnswers a, Facts f) {
		List<String> lines = new ArrayList<>();
		Experience said = Experience.fromWire(a.experience());
		if (said != null) {
			lines.add(said.saidLine());
		}
		if (f != null) {
			lines.add(f.savesRegularly() ? SAVES_LINE : NO_SAVES_LINE);
			lines.add(holdsLine(f));
		}
		return lines;
	}

	static List<String> focusBecause(List<Area> areas, OnboardingAnswers a, Facts f) {
		List<Area> goals = Area.fromGoals(a.goals());
		Set<String> lines = new LinkedHashSet<>();
		for (Area area : areas) {
			List<String> own = new ArrayList<>(area.supportingLines(a, f));
			if (goals.contains(area)) {
				own.add("You picked " + area.wire() + " as a goal.");
			}
			lines.addAll(own.isEmpty() ? List.of(NEUTRAL_LINE) : own);
		}
		return List.copyOf(lines);
	}

	static String holdsLine(Facts f) {
		return f.holdsInvestments() ? HOLDS_LINE : NO_HOLDS_LINE;
	}

	static String bufferLine(Facts f) {
		return "Your accounts cover " + Objects.requireNonNull(BUFFER.get(f.cashBufferMonths())) + " of spending.";
	}

	static boolean hasShortBuffer(Facts f) {
		return SHORT_BUFFER.contains(f.cashBufferMonths());
	}

}
