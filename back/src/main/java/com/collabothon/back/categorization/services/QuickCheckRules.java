package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.CategorizationConsts.ENOUGH_THRESHOLD;
import static com.collabothon.back.categorization.consts.CategorizationConsts.HORIZON_WITHIN_1Y;
import static com.collabothon.back.categorization.consts.CategorizationConsts.JUST_STARTING_BELOW;
import static com.collabothon.back.categorization.consts.CategorizationConsts.LONG_HORIZON_QUESTION_ID;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_GAP_CARDS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MIN_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.RULE_MAX_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.RULE_START;
import static com.collabothon.back.categorization.consts.CategorizationConsts.SHORT_HORIZON_QUESTION_ID;
import static com.collabothon.back.categorization.consts.CategorizationConsts.SOLID_ABOVE;
import static com.collabothon.back.categorization.consts.CategorizationConsts.SOLID_MIN_ANSWERS;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.function.ToDoubleFunction;
import java.util.stream.Stream;

import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.ConfidenceGapDto;
import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.Confidence;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.QuestionLevel;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

/** The Quick check rule (spec F1b, Reference: Fallback rule): Jev's safety net and the keyless path. */
final class QuickCheckRules {

	private static final Comparator<CheckQuestionProjection> EASY_FIRST = Comparator
		.comparing(CheckQuestionProjection::level, Comparator.comparing(level -> level != QuestionLevel.EASY))
		.thenComparing(CheckQuestionProjection::id);

	/** Goal areas first, then the fixed order, only areas with bank questions; a short horizon puts saving first. */
	static List<FocusArea> areaOrder(List<String> goals, String horizon, List<CheckQuestionProjection> bank) {
		Set<FocusArea> order = new LinkedHashSet<>(FocusArea.fromGoals(goals));
		order.addAll(Arrays.asList(FocusArea.values()));
		List<FocusArea> areas = new ArrayList<>(order.stream()
			.filter(area -> bank.stream().anyMatch(q -> q.area() == area))
			.toList());
		if (HORIZON_WITHIN_1Y.equals(horizon) && areas.indexOf(FocusArea.SAVING) > areas.indexOf(FocusArea.INVESTING)
				&& areas.contains(FocusArea.INVESTING)) {
			areas.remove(FocusArea.SAVING);
			areas.add(areas.indexOf(FocusArea.INVESTING), FocusArea.SAVING);
		}
		return areas;
	}

	/** Keeps the nulls: every bank area is a key, null until it has an answer. */
	static Map<String, Double> byWire(Map<FocusArea, Double> values) {
		Map<String, Double> wire = new LinkedHashMap<>();
		values.forEach((area, value) -> wire.put(area.wire(), value));
		return wire;
	}

	static Map<FocusArea, Double> mastery(List<FocusArea> areas, List<Answer> answers) {
		return meanPerArea(areas, answers, Answer::score);
	}

	static Map<FocusArea, Double> confidence(List<FocusArea> areas, List<Answer> answers) {
		return meanPerArea(areas, answers, Answer::chip);
	}

	private static Map<FocusArea, Double> meanPerArea(List<FocusArea> areas, List<Answer> answers,
			ToDoubleFunction<Answer> value) {
		Map<FocusArea, Double> means = new LinkedHashMap<>();
		for (FocusArea area : areas) {
			OptionalDouble mean = inArea(answers, area).stream().mapToDouble(value).average();
			means.put(area, mean.isPresent() ? mean.getAsDouble() : null);
		}
		return means;
	}

	static List<CheckQuestionProjection> unasked(List<CheckQuestionProjection> bank, List<Answer> answers) {
		return bank.stream().filter(q -> answers.stream().noneMatch(a -> a.question().id().equals(q.id()))).toList();
	}

	static Optional<CheckQuestionProjection> next(List<FocusArea> order, List<CheckQuestionProjection> bank,
			List<Answer> answers, String horizon) {
		List<CheckQuestionProjection> unasked = unasked(bank, answers);
		Optional<CheckQuestionProjection> pick = Optional.empty();
		if (!answers.isEmpty() && answers.getLast().result() != AnswerResult.CORRECT) {
			FocusArea area = answers.getLast().area();
			pick = firstIn(unasked, area).filter(q -> q.level() == QuestionLevel.EASY);
		}
		if (pick.isEmpty()) {
			pick = order.stream()
				.filter(area -> inArea(answers, area).isEmpty())
				.flatMap(area -> firstIn(unasked, area).stream())
				.findFirst();
		}
		if (pick.isEmpty()) {
			Map<FocusArea, Double> mastery = mastery(order, answers);
			pick = order.stream()
				.sorted(Comparator.comparing(area -> Objects.requireNonNullElse(mastery.get(area), RULE_START)))
				.flatMap(area -> firstIn(unasked, area).stream())
				.findFirst();
		}
		return pick.map(q -> shortHorizon(q, unasked, horizon));
	}

	private static Optional<CheckQuestionProjection> firstIn(List<CheckQuestionProjection> unasked, FocusArea area) {
		return unasked.stream().filter(q -> q.area() == area).min(EASY_FIRST);
	}

	static List<CheckQuestionProjection> forHorizon(List<CheckQuestionProjection> bank, String horizon) {
		return HORIZON_WITHIN_1Y.equals(horizon)
				? bank.stream().filter(q -> !q.id().equals(LONG_HORIZON_QUESTION_ID)).toList()
				: bank;
	}

	/** With money needed within a year, the saving question is the one about a fall before it is needed (D8). */
	static CheckQuestionProjection shortHorizon(CheckQuestionProjection next, List<CheckQuestionProjection> unasked,
			String horizon) {
		if (!HORIZON_WITHIN_1Y.equals(horizon) || next.area() != FocusArea.SAVING) {
			return next;
		}
		return unasked.stream().filter(q -> q.id().equals(SHORT_HORIZON_QUESTION_ID)).findFirst().orElse(next);
	}

	static boolean ruleDone(List<FocusArea> order, List<CheckQuestionProjection> unasked, List<Answer> answers) {
		return answers.size() >= RULE_MAX_QUESTIONS || unasked.isEmpty() || (answers.size() >= MIN_QUESTIONS
				&& order.stream().noneMatch(area -> inArea(answers, area).isEmpty()));
	}

	static boolean jevDone(List<CheckQuestionProjection> unasked, List<Answer> answers, double enough) {
		return answers.size() >= MAX_QUESTIONS || unasked.isEmpty()
				|| (answers.size() >= MIN_QUESTIONS && enough >= ENOUGH_THRESHOLD);
	}

	static List<Answer> inArea(List<Answer> answers, FocusArea area) {
		return answers.stream().filter(a -> a.area() == area).toList();
	}

	static boolean solid(FocusArea area, Map<FocusArea, Double> mastery, List<Answer> answers) {
		Double m = mastery.get(area);
		return m != null && m > SOLID_ABOVE && inArea(answers, area).size() >= SOLID_MIN_ANSWERS;
	}

	/** Areas where at least one answer carries a chip: the only ones a gap can be about. */
	static List<FocusArea> chipAreas(List<FocusArea> order, List<Answer> answers) {
		return order.stream().filter(area -> inArea(answers, area).stream().anyMatch(a -> a.confidence() != null))
			.toList();
	}

	static boolean overHolds(List<Answer> inArea) {
		return inArea.stream().anyMatch(a -> a.result() == AnswerResult.WRONG && a.confidence() == Confidence.SURE);
	}

	static boolean underHolds(List<Answer> inArea) {
		return !overHolds(inArea) && inArea.stream()
			.anyMatch(a -> a.result() == AnswerResult.CORRECT && a.confidence() != Confidence.SURE);
	}

	static Optional<GapDirection> ruleGap(List<Answer> inArea, Double mastery) {
		if (overHolds(inArea)) {
			return Optional.of(GapDirection.OVER);
		}
		boolean underMastery = mastery != null && mastery >= JUST_STARTING_BELOW;
		return underHolds(inArea) && underMastery ? Optional.of(GapDirection.UNDER) : Optional.empty();
	}

	/** A Jev label counts only when the chips back it up; anything else reads as aligned. */
	static Optional<GapDirection> checkedJevGap(GapDirection label, List<Answer> inArea) {
		boolean holds = label == GapDirection.OVER ? overHolds(inArea)
				: label == GapDirection.UNDER && underHolds(inArea);
		return holds ? Optional.of(label) : Optional.empty();
	}

	/** {@code gaps} in area order; under before over, at most MAX_GAP_CARDS cards. */
	static List<ConfidenceGapDto> gapCards(Map<FocusArea, GapDirection> gaps, List<Answer> answers,
			FocusArea startLessonArea) {
		return gaps.entrySet().stream()
			.sorted(Comparator.comparing(gap -> gap.getValue() != GapDirection.UNDER))
			.limit(MAX_GAP_CARDS)
			.map(gap -> new ConfidenceGapDto(gap.getKey(), gap.getValue(),
					because(gap.getKey(), gap.getValue(), inArea(answers, gap.getKey()), startLessonArea)))
			.toList();
	}

	private static String because(FocusArea area, GapDirection direction, List<Answer> inArea,
			FocusArea startLessonArea) {
		Stream<Confidence> chips = inArea.stream().map(Answer::confidence).filter(Objects::nonNull);
		if (direction == GapDirection.UNDER) {
			String chip = chips.min(Comparator.naturalOrder()).orElseThrow().getLabel();
			return "On %s you said “%s”, yet your answers show you already understand how it works."
				.formatted(area.getLabel(), chip);
		}
		String chip = chips.max(Comparator.naturalOrder()).orElseThrow().getLabel();
		String end = area == startLessonArea ? "open, which is where your first lesson starts." : "open to explore.";
		return "On %s you said “%s”. Your answers leave a few things %s".formatted(area.getLabel(), chip, end);
	}

	/** Every lesson with bank rows, in lesson id order. */
	static List<BankLesson> lessons(List<CheckQuestionProjection> bank) {
		Map<Long, BankLesson> lessons = new LinkedHashMap<>();
		bank.stream()
			.sorted(Comparator.comparing(CheckQuestionProjection::id))
			.forEach(q -> lessons.putIfAbsent(q.lessonId(), new BankLesson(q.lessonId(), q.lessonTitle(),
					q.lessonSummary(), q.lessonPosition(), q.area())));
		return lessons.values().stream().sorted(Comparator.comparing(BankLesson::id)).toList();
	}

	/** Uncompleted lessons of non-Solid areas in path order: answered areas weakest first, then unanswered ones. */
	static List<BankLesson> candidates(List<BankLesson> lessons, List<FocusArea> order, Map<FocusArea, Double> mastery,
			List<Answer> answers, Set<Long> completed) {
		Comparator<BankLesson> pathOrder = Comparator
			.comparing((BankLesson l) -> inArea(answers, l.area()).isEmpty())
			.thenComparing(l -> inArea(answers, l.area()).isEmpty() ? 0 : masteryOrStart(mastery, l.area()))
			.thenComparing(l -> order.indexOf(l.area()))
			.thenComparing(BankLesson::id);
		return lessons.stream()
			.filter(l -> order.contains(l.area()) && !solid(l.area(), mastery, answers) && !completed.contains(l.id()))
			.sorted(pathOrder)
			.toList();
	}

	/** Jev and the rule pick from answered areas when any have a candidate. */
	static List<BankLesson> pool(List<BankLesson> candidates, List<Answer> answers) {
		List<BankLesson> answered = candidates.stream().filter(l -> !inArea(answers, l.area()).isEmpty()).toList();
		return answered.isEmpty() ? candidates : answered;
	}

	static BankLesson ruleFirstLesson(List<BankLesson> pool, List<FocusArea> order, Map<FocusArea, Double> mastery,
			List<Answer> answers) {
		FocusArea weakest = pool.stream()
			.map(BankLesson::area)
			.min(Comparator.comparing((FocusArea area) -> masteryOrStart(mastery, area)).thenComparing(order::indexOf))
			.orElseThrow();
		List<BankLesson> inWeakest = pool.stream().filter(l -> l.area() == weakest).toList();
		// min keeps the first of equal scores, so a tie goes to the earlier answer.
		return inArea(answers, weakest).stream()
			.filter(a -> inWeakest.stream().anyMatch(l -> l.id().equals(a.question().lessonId())))
			.min(Comparator.comparingDouble(Answer::score))
			.flatMap(a -> inWeakest.stream().filter(l -> l.id().equals(a.question().lessonId())).findFirst())
			.orElse(inWeakest.getFirst());
	}

	/** {@code picked} is Jev's pick from the pool, or null for the rule's. */
	static LessonPlan plan(List<BankLesson> lessons, List<BankLesson> candidates, BankLesson picked,
			List<FocusArea> order, Map<FocusArea, Double> mastery, List<Answer> answers, Set<Long> completed) {
		if (candidates.isEmpty()) {
			Optional<BankLesson> next = lessons.stream()
				.filter(l -> !completed.contains(l.id()))
				.max(Comparator.comparing(BankLesson::position));
			return new LessonPlan(next.orElse(null), order.stream().allMatch(area -> solid(area, mastery, answers)),
					next.map(l -> List.of(l.id())).orElse(List.of()));
		}
		List<BankLesson> pool = pool(candidates, answers);
		BankLesson start = pool.size() < JevConsts.MIN_CHOICE_LABELS ? pool.getFirst()
				: Objects.requireNonNullElseGet(picked, () -> ruleFirstLesson(pool, order, mastery, answers));
		List<Long> path = new ArrayList<>(List.of(start.id()));
		candidates.stream().map(BankLesson::id).filter(id -> !id.equals(start.id())).forEach(path::add);
		return new LessonPlan(start, false, path);
	}

	private static double masteryOrStart(Map<FocusArea, Double> mastery, FocusArea area) {
		return Objects.requireNonNullElse(mastery.get(area), RULE_START);
	}

}
