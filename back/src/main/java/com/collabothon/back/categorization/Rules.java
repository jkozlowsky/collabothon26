package com.collabothon.back.categorization;

import static com.collabothon.back.bank.Facts.AGE_18_25;
import static com.collabothon.back.bank.Facts.AGE_26_34;
import static com.collabothon.back.bank.Facts.AGE_35_44;
import static com.collabothon.back.bank.Facts.AGE_45_54;
import static com.collabothon.back.bank.Facts.AGE_55_64;
import static com.collabothon.back.bank.Facts.AGE_65_PLUS;
import static com.collabothon.back.bank.Facts.BUFFER_1_3;
import static com.collabothon.back.bank.Facts.BUFFER_3_6;
import static com.collabothon.back.bank.Facts.BUFFER_6_PLUS;
import static com.collabothon.back.bank.Facts.BUFFER_UNDER_1;
import static com.collabothon.back.bank.Facts.RATE_10_20;
import static com.collabothon.back.bank.Facts.RATE_20_PLUS;
import static com.collabothon.back.bank.Facts.WINDOW_MONTHS;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

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

import lombok.RequiredArgsConstructor;

final class Rules {

	static final double FOCUS_THRESHOLD = 0.5;

	static final int LOW_CONFIDENCE = 2;

	static final int HIGH_CONFIDENCE = 4;

	static final String NEUTRAL_LINE = "It fits the answers you gave.";

	private static final String LEARNING_SIMPLE = "simple";

	private static final String LEARNING_DETAILED = "detailed";

	private static final String LAST_MONTHS = "the last " + WINDOW_MONTHS + " months";

	static final Map<String, String> BUFFER = Map.of(BUFFER_UNDER_1, "less than a month", BUFFER_1_3,
			"1 to 3 months", BUFFER_3_6, "3 to 6 months", BUFFER_6_PLUS, "more than 6 months");

	private static final Map<String, String> KEPT_OF_INCOME = Map.of(RATE_10_20, "10 to 20%", RATE_20_PLUS,
			"more than 20%");

	private static final Set<String> SHORT_BUFFER = Set.of(BUFFER_UNDER_1, BUFFER_1_3);

	private static final Set<String> AGE_45_PLUS = Set.of(AGE_45_54, AGE_55_64, AGE_65_PLUS);

	@RequiredArgsConstructor
	enum Experience {

		NOT_SAVING("I don't save yet"), NONE("I save, but don't invest yet"), TRIED("Tried it once or twice"),
		REGULAR("I invest regularly"), EXPERIENCED("I'm pretty experienced");

		private final String label;

		static Experience fromWire(String value) {
			return value == null ? null : Arrays.stream(values())
				.filter(e -> Categorization.wireName(e).equals(value))
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Unknown experience: " + value));
		}

	}

	record Judgement(Role role, Map<String, Double> roleProbabilities, LifeStage lifeStage,
			Map<String, Double> lifeStageProbabilities, List<Area> focusAreas,
			Map<String, Double> focusProbabilities, String model) {
	}

	private Rules() {
	}

	static Judgement fallback(OnboardingAnswers a, Facts f, boolean askLifeStage) {
		Role role = fallbackRole(a, f);
		return new Judgement(role, Map.of(), askLifeStage ? lifeStageFromAge(f.ageBand()) : null, Map.of(),
				fallbackFocus(a, f, role), Map.of(), null);
	}

	/** The declaration decides; facts only lift a non-investor who saves regularly. */
	static Role fallbackRole(OnboardingAnswers a, Facts f) {
		return switch (Experience.fromWire(a.experience())) {
			case REGULAR, EXPERIENCED -> Role.ADVANCED;
			case TRIED -> Role.INTERMEDIATE;
			case null, default -> f != null && f.savesRegularly() ? Role.INTERMEDIATE : Role.NOVICE;
		};
	}

	static LifeStage lifeStageFromAge(String ageBand) {
		return switch (ageBand) {
			case AGE_18_25 -> LifeStage.STUDENT;
			case AGE_26_34 -> LifeStage.ESTABLISHED;
			case AGE_35_44, AGE_45_54 -> LifeStage.FAMILY;
			case AGE_55_64, AGE_65_PLUS -> LifeStage.PRE_RETIREMENT;
			default -> throw new IllegalArgumentException("Unknown age band: " + ageBand);
		};
	}

	static List<Area> fallbackFocus(OnboardingAnswers a, Facts f, Role role) {
		Set<Area> areas = new LinkedHashSet<>();
		if (f != null) {
			if (f.overdraftMonths() > 0) {
				areas.add(Area.DEBT);
			}
			if (hasShortBuffer(f)) {
				areas.add(Area.SAVING);
			}
			if (!f.holdsInvestments() && f.cashBufferMonths().equals(BUFFER_6_PLUS)) {
				areas.add(Area.INVESTING);
			}
			if (isAge45Plus(f)) {
				areas.add(Area.RETIREMENT);
			}
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

	static List<ConfidenceGap> confidenceGaps(OnboardingAnswers a, Facts f) {
		if (f == null) {
			return List.of();
		}
		List<ConfidenceGap> gaps = new ArrayList<>();
		Confidence c = a.confidence();
		Integer n = c.budgeting();
		if (isLow(n) && f.overdraftMonths() == 0 && KEPT_OF_INCOME.containsKey(f.savingsRate())) {
			gaps.add(new ConfidenceGap(ConfidenceArea.BUDGETING, Direction.UNDER,
					"You rate yourself %d/5 on everyday money, and your current account stayed above zero in %s while you kept %s of your income."
						.formatted(n, LAST_MONTHS, KEPT_OF_INCOME.get(f.savingsRate()))));
		}
		else if (isHigh(n) && f.overdraftMonths() > 0) {
			gaps.add(new ConfidenceGap(ConfidenceArea.BUDGETING, Direction.OVER,
					"You rate yourself %d/5 on everyday money, and your current account went below zero in %d of %s."
						.formatted(n, f.overdraftMonths(), LAST_MONTHS)));
		}
		n = c.saving();
		if (isLow(n) && f.savesRegularly()) {
			gaps.add(new ConfidenceGap(ConfidenceArea.SAVING, Direction.UNDER,
					"You rate yourself %d/5 on saving, and you moved money to savings in most of %s."
						.formatted(n, LAST_MONTHS)));
		}
		else if (isHigh(n) && f.cashBufferMonths().equals(BUFFER_UNDER_1)) {
			gaps.add(new ConfidenceGap(ConfidenceArea.SAVING, Direction.OVER,
					"You rate yourself %d/5 on saving, and your accounts cover less than a month of spending."
						.formatted(n)));
		}
		n = c.investing();
		Experience experience = Experience.fromWire(a.experience());
		if (isLow(n) && f.holdsInvestments()) {
			gaps.add(new ConfidenceGap(ConfidenceArea.INVESTING, Direction.UNDER,
					"You rate yourself %d/5 on investing, and your accounts with us include investment products."
						.formatted(n)));
		}
		else if (isHigh(n) && !f.holdsInvestments()
				&& (experience == Experience.NOT_SAVING || experience == Experience.NONE)) {
			gaps.add(new ConfidenceGap(ConfidenceArea.INVESTING, Direction.OVER,
					"You rate yourself %d/5 on investing, and there are no investment products in your accounts with us."
						.formatted(n)));
		}
		return gaps;
	}

	static LessonVariant lessonVariant(Role role, LifeStage lifeStage, String learningStyle) {
		Lang lang = switch (learningStyle) {
			case LEARNING_SIMPLE -> Lang.PLAIN;
			case LEARNING_DETAILED -> Lang.STANDARD;
			case null, default -> role == Role.NOVICE ? Lang.PLAIN : Lang.STANDARD;
		};
		LifeStage persona = lifeStage == LifeStage.ESTABLISHED ? null : lifeStage;
		return new LessonVariant(persona, role == Role.ADVANCED ? Level.ADVANCED : Level.BEGINNER, lang);
	}

	static List<String> roleBecause(OnboardingAnswers a, Facts f) {
		List<String> lines = new ArrayList<>();
		Experience experience = Experience.fromWire(a.experience());
		if (experience != null) {
			lines.add("You said: " + experience.label + ".");
		}
		Confidence c = a.confidence();
		List<String> rated = new ArrayList<>();
		if (c.budgeting() != null) {
			rated.add(c.budgeting() + "/5 on everyday money");
		}
		if (c.saving() != null) {
			rated.add(c.saving() + "/5 on saving");
		}
		if (c.investing() != null) {
			rated.add(c.investing() + "/5 on investing");
		}
		if (!rated.isEmpty()) {
			lines.add("You rate yourself " + String.join(", ", rated) + ".");
		}
		if (f != null) {
			lines.add(f.savesRegularly() ? "You move money to savings in most months."
					: "No regular transfers to savings in " + LAST_MONTHS + ".");
			lines.add(holdsLine(f));
		}
		return lines;
	}

	static List<String> lifeStageBecause(Facts f) {
		return f.hasMortgage() ? List.of(ageLine(f), "You are paying off a mortgage.") : List.of(ageLine(f));
	}

	static List<String> focusBecause(List<Area> areas, OnboardingAnswers a, Facts f) {
		List<Area> goals = Area.fromGoals(a.goals());
		Set<String> lines = new LinkedHashSet<>();
		for (Area area : areas) {
			List<String> own = new ArrayList<>(f == null ? List.of() : area.supportingLines(f));
			if (goals.contains(area)) {
				own.add("You picked " + area.wire() + " as a goal.");
			}
			lines.addAll(own.isEmpty() ? List.of(NEUTRAL_LINE) : own);
		}
		return List.copyOf(lines);
	}

	static String holdsLine(Facts f) {
		return f.holdsInvestments() ? "Your accounts with us include investment products."
				: "No investment products in your accounts with us.";
	}

	static String bufferLine(Facts f) {
		return "Your accounts cover " + Objects.requireNonNull(BUFFER.get(f.cashBufferMonths())) + " of spending.";
	}

	static String overdraftLine(Facts f) {
		return "Your current account went below zero in %d of %s.".formatted(f.overdraftMonths(), LAST_MONTHS);
	}

	static String ageLine(Facts f) {
		return "Age group " + f.ageBand() + ".";
	}

	static boolean hasShortBuffer(Facts f) {
		return SHORT_BUFFER.contains(f.cashBufferMonths());
	}

	static boolean isAge45Plus(Facts f) {
		return AGE_45_PLUS.contains(f.ageBand());
	}

	private static boolean isLow(Integer confidence) {
		return confidence != null && confidence <= LOW_CONFIDENCE;
	}

	private static boolean isHigh(Integer confidence) {
		return confidence != null && confidence >= HIGH_CONFIDENCE;
	}

}
