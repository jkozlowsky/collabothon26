package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.CategorizationConsts.FOCUS_THRESHOLD;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_1_3;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_3_6;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_6_PLUS;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_UNDER_1;
import static com.collabothon.back.categorization.consts.FactsConsts.RATE_NEGATIVE;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import com.collabothon.back.categorization.dto.CheckDto;
import com.collabothon.back.categorization.dto.ConfidenceGapDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.LessonVariantDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.enums.CheckResult;
import com.collabothon.back.categorization.enums.ConfidenceArea;
import com.collabothon.back.categorization.enums.Experience;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.LessonLang;
import com.collabothon.back.categorization.enums.LessonLevel;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

final class CategorizationRules {

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

	private static final Set<Experience> SAYS_LITTLE_SAVING = EnumSet.of(Experience.NOT_SAVING,
			Experience.OCCASIONAL);

	private static final Set<Experience> SAYS_INVESTING = EnumSet.of(Experience.INVESTING, Experience.PLANNING);

	static Judgement fallback(OnboardingAnswersDto a, FactsDto f) {
		Role role = fallbackRole(a, f);
		return new Judgement(role, Map.of(), fallbackFocus(a, f, role), Map.of(), null, Map.of());
	}

	/** The declaration decides; facts only lift someone who saves now and then but does so every month. */
	static Role fallbackRole(OnboardingAnswersDto a, FactsDto f) {
		return switch (Experience.fromWire(a.experience())) {
			case INVESTING, PLANNING -> Role.ADVANCED;
			case REGULAR -> Role.INTERMEDIATE;
			case OCCASIONAL -> f != null && f.savesRegularly() ? Role.INTERMEDIATE : Role.NOVICE;
			case NOT_SAVING -> Role.NOVICE;
			case null -> Role.NOVICE;
		};
	}

	static List<FocusArea> fallbackFocus(OnboardingAnswersDto a, FactsDto f, Role role) {
		Set<FocusArea> areas = new LinkedHashSet<>();
		if (f != null) {
			if (f.inOverdraft() || f.hasLoan()) {
				areas.add(FocusArea.DEBT);
			}
			if (hasShortBuffer(f)) {
				areas.add(FocusArea.SAVING);
			}
			if (!f.holdsInvestments() && f.cashBufferMonths().equals(BUFFER_6_PLUS)) {
				areas.add(FocusArea.INVESTING);
			}
		}
		if (LifeStage.fromAnswer(a.lifeStage()) == LifeStage.PRE_RETIREMENT) {
			areas.add(FocusArea.RETIREMENT);
		}
		if (role == Role.NOVICE) {
			areas.add(FocusArea.RISK);
		}
		areas.addAll(FocusArea.fromGoals(a.goals()));
		return areas.isEmpty() ? List.of(FocusArea.SAVING) : List.copyOf(areas);
	}

	/** Areas at or above the threshold, most likely first; none passes → the single most likely one. */
	static List<FocusArea> focusFromNoul(Map<FocusArea, Double> noul) {
		List<FocusArea> sorted = Arrays.stream(FocusArea.values())
			.sorted(Comparator.comparing(noul::get).reversed())
			.toList();
		List<FocusArea> picked = sorted.stream().filter(area -> noul.get(area) >= FOCUS_THRESHOLD).toList();
		return picked.isEmpty() ? sorted.subList(0, 1) : picked;
	}

	/** Where what the user said about themselves and what their accounts or their Quick check answers show differ. */
	static List<ConfidenceGapDto> confidenceGaps(OnboardingAnswersDto a, FactsDto f, List<CheckDto> checks) {
		Experience said = Experience.fromWire(a.experience());
		if (said == null) {
			return List.of();
		}
		List<ConfidenceGapDto> gaps = new ArrayList<>();
		if (f != null) {
			accountGaps(said, f, gaps);
		}
		for (ConfidenceArea area : ConfidenceArea.values()) {
			checkGap(said, area, gaps, checks);
		}
		return gaps;
	}

	private static void accountGaps(Experience said, FactsDto f, List<ConfidenceGapDto> gaps) {
		if (SAYS_LITTLE_SAVING.contains(said) && f.savesRegularly()) {
			gaps.add(gap(ConfidenceArea.SAVING, GapDirection.UNDER, said, SAVES_LINE));
		}
		else if (!SAYS_LITTLE_SAVING.contains(said) && f.cashBufferMonths().equals(BUFFER_UNDER_1)) {
			gaps.add(gap(ConfidenceArea.SAVING, GapDirection.OVER, said, bufferLine(f)));
		}
		if (!SAYS_INVESTING.contains(said) && f.holdsInvestments()) {
			gaps.add(gap(ConfidenceArea.INVESTING, GapDirection.UNDER, said, HOLDS_LINE));
		}
		else if (SAYS_INVESTING.contains(said) && !f.holdsInvestments()) {
			gaps.add(gap(ConfidenceArea.INVESTING, GapDirection.OVER, said, NO_HOLDS_LINE));
		}
	}

	/** An account gap in the area gets the check cited; otherwise the check alone can raise one, per the rule table. */
	private static void checkGap(Experience said, ConfidenceArea area, List<ConfidenceGapDto> gaps,
			List<CheckDto> checks) {
		FocusArea focusArea = FocusArea.valueOf(area.name());
		boolean understands = hasCheck(checks, focusArea, CheckResult.UNDERSTANDS);
		boolean notYet = hasCheck(checks, focusArea, CheckResult.NOT_YET);
		boolean saysLow = area == ConfidenceArea.SAVING ? SAYS_LITTLE_SAVING.contains(said) : !SAYS_INVESTING.contains(said);
		String cite = ", and your answer about " + area.wire();
		for (int i = 0; i < gaps.size(); i++) {
			ConfidenceGapDto existing = gaps.get(i);
			if (existing.area() == area) {
				if (existing.direction() == GapDirection.UNDER && understands) {
					String because = existing.because();
					gaps.set(i, new ConfidenceGapDto(area, GapDirection.UNDER,
							because.substring(0, because.length() - 1) + cite + " shows you understand it."));
				}
				return;
			}
		}
		String prefix = "You said: " + said.getLabel();
		if (saysLow && understands) {
			gaps.add(new ConfidenceGapDto(area, GapDirection.UNDER, prefix + cite + " shows you understand it."));
		}
		else if (!saysLow && notYet) {
			gaps.add(new ConfidenceGapDto(area, GapDirection.OVER, prefix + cite + " shows there is more to learn."));
		}
	}

	private static boolean hasCheck(List<CheckDto> checks, FocusArea area, CheckResult result) {
		return checks.stream().anyMatch(c -> c.area() == area && c.result() == result);
	}

	private static ConfidenceGapDto gap(ConfidenceArea area, GapDirection direction, Experience said, String shows) {
		return new ConfidenceGapDto(area, direction, said.saidLine() + " " + shows);
	}

	/** Weak spots the answers revealed go first; the areas Jev picked keep their order behind them. */
	static List<FocusArea> focusWithChecks(List<FocusArea> focus, List<CheckDto> checks) {
		Set<FocusArea> areas = new LinkedHashSet<>();
		checks.stream()
			.filter(c -> c.result() == CheckResult.NOT_YET && !focus.contains(c.area()))
			.map(CheckDto::area)
			.forEach(areas::add);
		areas.addAll(focus);
		return List.copyOf(areas);
	}

	/** The lesson of the weakest check, else the earliest lesson of the first focus area that has one. */
	static Optional<StartLessonDto> startLesson(List<CheckDto> checks, List<FocusArea> focus,
			List<CheckQuestionProjection> pool) {
		Comparator<CheckDto> weakestFirst = Comparator
			.comparing((CheckDto c) -> c.result() == CheckResult.NOT_YET ? 0 : 1)
			.thenComparing(c -> focus.contains(c.area()) ? focus.indexOf(c.area()) : focus.size());
		Optional<Long> lessonId = checks.stream()
			.filter(c -> c.lessonId() != null && c.result() != CheckResult.UNDERSTANDS)
			.min(weakestFirst)
			.map(CheckDto::lessonId)
			.or(() -> focus.stream().flatMap(area -> earliestLesson(area, pool).stream()).findFirst());
		return lessonId.flatMap(id -> pool.stream()
			.filter(q -> id.equals(q.lessonId()))
			.findFirst()
			.map(q -> new StartLessonDto(id, q.lessonTitle())));
	}

	private static Optional<Long> earliestLesson(FocusArea area, List<CheckQuestionProjection> pool) {
		return pool.stream()
			.filter(q -> q.area() == area && q.lessonId() != null)
			.map(CheckQuestionProjection::lessonId)
			.min(Comparator.naturalOrder());
	}

	static LessonVariantDto lessonVariant(Role role, LifeStage lifeStage) {
		LifeStage persona = lifeStage == LifeStage.ESTABLISHED ? null : lifeStage;
		return new LessonVariantDto(persona, role == Role.ADVANCED ? LessonLevel.ADVANCED : LessonLevel.BEGINNER,
				role == Role.NOVICE ? LessonLang.PLAIN : LessonLang.STANDARD);
	}

	static List<String> roleBecause(OnboardingAnswersDto a, FactsDto f) {
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

	static List<String> focusBecause(List<FocusArea> areas, OnboardingAnswersDto a, FactsDto f) {
		List<FocusArea> goals = FocusArea.fromGoals(a.goals());
		Set<String> lines = new LinkedHashSet<>();
		for (FocusArea area : areas) {
			List<String> own = supportingLines(area, a, f);
			if (goals.contains(area)) {
				own.add("You picked " + area.wire() + " as a goal.");
			}
			lines.addAll(own.isEmpty() ? List.of(NEUTRAL_LINE) : own);
		}
		return List.copyOf(lines);
	}

	/** Only the lines that argue for this area; a fact that argues against it is left out. */
	private static List<String> supportingLines(FocusArea area, OnboardingAnswersDto a, FactsDto f) {
		List<String> lines = new ArrayList<>();
		if (area == FocusArea.RETIREMENT && LifeStage.fromAnswer(a.lifeStage()) == LifeStage.PRE_RETIREMENT) {
			lines.add(RETIREMENT_LINE);
		}
		if (f == null) {
			return lines;
		}
		switch (area) {
			case SAVING -> {
				if (hasShortBuffer(f)) {
					lines.add(bufferLine(f));
				}
				if (f.savingsRate().equals(RATE_NEGATIVE)) {
					lines.add(OVERSPENT_LINE);
				}
			}
			case DEBT -> {
				if (f.inOverdraft()) {
					lines.add(OVERDRAFT_LINE);
				}
				if (f.hasLoan()) {
					lines.add(LOAN_LINE);
				}
			}
			case INVESTING -> {
				if (!f.holdsInvestments()) {
					lines.add(holdsLine(f));
				}
				if (f.cashBufferMonths().equals(BUFFER_6_PLUS)) {
					lines.add(bufferLine(f));
				}
			}
			case RISK -> {
				if (f.holdsInvestments()) {
					lines.add(holdsLine(f));
				}
			}
		}
		return lines;
	}

	private static String holdsLine(FactsDto f) {
		return f.holdsInvestments() ? HOLDS_LINE : NO_HOLDS_LINE;
	}

	private static String bufferLine(FactsDto f) {
		return "Your accounts cover " + Objects.requireNonNull(BUFFER.get(f.cashBufferMonths())) + " of spending.";
	}

	private static boolean hasShortBuffer(FactsDto f) {
		return SHORT_BUFFER.contains(f.cashBufferMonths());
	}

}
