package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.CategorizationConsts.ENOUGH_THRESHOLD;
import static com.collabothon.back.categorization.consts.CategorizationConsts.HORIZON_WITHIN_1Y;
import static com.collabothon.back.categorization.consts.CategorizationConsts.JUST_STARTING_BELOW;
import static com.collabothon.back.categorization.consts.CategorizationConsts.LESSON_CHOICES_PER_AREA;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_GAP_CARDS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MIN_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.RULE_MAX_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.RULE_START;
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
import java.util.function.Function;
import java.util.function.ToDoubleFunction;
import java.util.random.RandomGenerator;

import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.GapDto;
import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.Role;

final class QuickCheckRules {

	/** Goal areas first, then the fixed order, only areas with questions; a short horizon puts saving first. */
	static List<FocusArea> areaOrder(List<String> goals, String horizon, List<CheckQuestion> pool) {
		Set<FocusArea> order = new LinkedHashSet<>(FocusArea.fromGoals(goals));
		order.addAll(Arrays.asList(FocusArea.values()));
		List<FocusArea> areas = new ArrayList<>(order.stream()
			.filter(area -> pool.stream().anyMatch(q -> q.area() == area))
			.toList());
		if (HORIZON_WITHIN_1Y.equals(horizon) && areas.indexOf(FocusArea.SAVING) > areas.indexOf(FocusArea.INVESTING)
				&& areas.contains(FocusArea.INVESTING)) {
			areas.remove(FocusArea.SAVING);
			areas.add(areas.indexOf(FocusArea.INVESTING), FocusArea.SAVING);
		}
		return areas;
	}

	/** Keeps the nulls: every area with questions is a key, null until it has an answer. */
	static Map<String, Double> byWire(Map<FocusArea, Double> values) {
		Map<String, Double> wire = new LinkedHashMap<>();
		values.forEach((area, value) -> wire.put(area.wire(), value));
		return wire;
	}

	static Map<FocusArea, Double> mastery(List<FocusArea> areas, List<Answer> answers) {
		return meanPerArea(areas, answers, Answer::score);
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

	/** The questions that can still be asked, in pool order: not asked yet, in lessons the user has not completed. */
	static List<CheckQuestion> open(List<CheckQuestion> pool, List<Answer> answers, Set<String> completed) {
		return pool.stream()
			.filter(q -> !completed.contains(q.lessonId())
					&& answers.stream().noneMatch(a -> a.question().id().equals(q.id())))
			.toList();
	}

	/** The lesson the next question comes from; empty when no question is left. */
	static Optional<String> nextLesson(List<FocusArea> order, List<CheckQuestion> pool, List<CheckQuestion> open,
			List<Answer> answers) {
		Optional<CheckQuestion> pick = Optional.empty();
		if (!answers.isEmpty() && answers.getLast().result() != AnswerResult.CORRECT) {
			pick = sameLessonOrLaterInStory(pool, open, answers.getLast().question());
		}
		if (pick.isEmpty()) {
			pick = order.stream()
				.filter(area -> inArea(answers, area).isEmpty())
				.flatMap(area -> firstIn(open, area, answers).stream())
				.findFirst();
		}
		if (pick.isEmpty()) {
			pick = oneShortOfSolid(order, open, answers).flatMap(area -> firstIn(open, area, answers));
		}
		if (pick.isEmpty()) {
			Map<FocusArea, Double> mastery = mastery(order, answers);
			pick = order.stream()
				.sorted(Comparator.comparing(area -> masteryOrStart(mastery, area)))
				.flatMap(area -> firstIn(open, area, answers).stream())
				.findFirst();
		}
		return pick.map(CheckQuestion::lessonId);
	}

	/** After an answer that is not right: the same lesson while it has a question left, else the story's next one. */
	private static Optional<CheckQuestion> sameLessonOrLaterInStory(List<CheckQuestion> pool, List<CheckQuestion> open,
			CheckQuestion last) {
		int lessonStart = pool.indexOf(pool.stream().filter(q -> q.lessonId().equals(last.lessonId())).findFirst()
			.orElseThrow());
		return open.stream()
			.filter(q -> q.storyId().equals(last.storyId()) && pool.indexOf(q) >= lessonStart)
			.findFirst();
	}

	/** In story order, a lesson with no answer yet before one already asked about. */
	private static Optional<CheckQuestion> firstIn(List<CheckQuestion> open, FocusArea area, List<Answer> answers) {
		// min keeps the first of equals, so story order decides among lessons of the same kind.
		return open.stream()
			.filter(q -> q.area() == area)
			.min(Comparator.comparing(q -> answers.stream().anyMatch(a -> a.question().lessonId().equals(q.lessonId()))));
	}

	/** One of the lesson's open questions, each as likely as the others. */
	static CheckQuestion draw(List<CheckQuestion> open, String lessonId, RandomGenerator random) {
		List<CheckQuestion> ofLesson = open.stream().filter(q -> q.lessonId().equals(lessonId)).toList();
		return ofLesson.get(random.nextInt(ofLesson.size()));
	}

	/** What Jev chooses the next lesson from: per area, the first lessons with a question left. */
	static List<CheckLesson> nextLessonChoices(List<FocusArea> order, List<CheckLesson> open) {
		return order.stream()
			.flatMap(area -> acrossStories(open.stream().filter(l -> l.area() == area).toList()).stream()
				.limit(LESSON_CHOICES_PER_AREA))
			.toList();
	}

	/** Each story's first lesson before any story's second, so a short choice spans the area's stories. */
	private static List<CheckLesson> acrossStories(List<CheckLesson> lessons) {
		return lessons.stream()
			.sorted(Comparator.comparingLong(l -> lessons.stream()
				.takeWhile(other -> !other.id().equals(l.id()))
				.filter(other -> other.storyId().equals(l.storyId()))
				.count()))
			.toList();
	}

	static boolean ruleDone(List<FocusArea> order, List<CheckQuestion> open, List<Answer> answers) {
		// A run without a mistake may go on to the maximum, so two answers in each area can make every area Solid.
		int limit = answers.stream().allMatch(a -> a.result() == AnswerResult.CORRECT) ? MAX_QUESTIONS
				: RULE_MAX_QUESTIONS;
		return answers.size() >= limit || open.isEmpty() || (answers.size() >= MIN_QUESTIONS
				&& order.stream().noneMatch(area -> inArea(answers, area).isEmpty() && hasQuestion(open, area))
				&& oneShortOfSolid(order, open, answers).isEmpty());
	}

	/** In a run without a mistake, the first area one answer short of Solid that still has a question to ask. */
	private static Optional<FocusArea> oneShortOfSolid(List<FocusArea> order, List<CheckQuestion> open,
			List<Answer> answers) {
		if (answers.stream().anyMatch(a -> a.result() != AnswerResult.CORRECT)) {
			return Optional.empty();
		}
		return order.stream()
			.filter(area -> inArea(answers, area).size() == SOLID_MIN_ANSWERS - 1 && hasQuestion(open, area))
			.findFirst();
	}

	private static boolean hasQuestion(List<CheckQuestion> open, FocusArea area) {
		return open.stream().anyMatch(q -> q.area() == area);
	}

	static boolean jevDone(List<CheckQuestion> open, List<Answer> answers, double enough) {
		return answers.size() >= MAX_QUESTIONS || open.isEmpty()
				|| (answers.size() >= MIN_QUESTIONS && enough >= ENOUGH_THRESHOLD);
	}

	static List<Answer> inArea(List<Answer> answers, FocusArea area) {
		return answers.stream().filter(a -> a.area() == area).toList();
	}

	static boolean solid(FocusArea area, Map<FocusArea, Double> mastery, List<Answer> answers) {
		Double m = mastery.get(area);
		return m != null && m > SOLID_ABOVE && inArea(answers, area).size() >= SOLID_MIN_ANSWERS;
	}

	/** J3: without an area at least Building (mastery ≥ JUST_STARTING_BELOW with an answer), novice. */
	static Role cappedRole(Role role, Map<FocusArea, Double> mastery, List<Answer> answers) {
		boolean building = mastery.entrySet().stream()
			.anyMatch(m -> m.getValue() != null && m.getValue() >= JUST_STARTING_BELOW
					&& !inArea(answers, m.getKey()).isEmpty());
		return building ? role : Role.NOVICE;
	}

	/**
	 * The role the answers show, for a user who declared no experience. It follows the map: one answered area above
	 * SOLID_ABOVE is enough for intermediate, even with a single answer; advanced needs every answered area Solid.
	 */
	static Role measuredRole(Map<FocusArea, Double> mastery, List<Answer> answers) {
		List<FocusArea> answered = answers.stream().map(Answer::area).distinct().toList();
		if (answered.stream().noneMatch(area -> mastery.get(area) != null && mastery.get(area) > SOLID_ABOVE)) {
			return Role.NOVICE;
		}
		return answered.stream().allMatch(area -> solid(area, mastery, answers)) ? Role.ADVANCED : Role.INTERMEDIATE;
	}

	/** What the account shows for an area; null for an area the facts say nothing about. */
	private static Boolean habit(FocusArea area, FactsDto facts) {
		return switch (area) {
			case SAVING -> facts.savesRegularly();
			case INVESTING -> facts.holdsInvestments();
			default -> null;
		};
	}

	/** Answered areas the facts say something about: the only ones a gap can be about. None without facts. */
	static List<FocusArea> gapAreas(List<FocusArea> order, List<Answer> answers, FactsDto facts) {
		return order.stream()
			.filter(area -> facts != null && habit(area, facts) != null && !inArea(answers, area).isEmpty())
			.toList();
	}

	/** The habit with an answer not right is habit ahead; no habit with every answer right is knowledge ahead. */
	static Optional<GapDirection> ruleGap(FocusArea area, List<Answer> inArea, FactsDto facts) {
		if (gapAreas(List.of(area), inArea, facts).isEmpty()) {
			return Optional.empty();
		}
		boolean allRight = inArea.stream().allMatch(a -> a.result() == AnswerResult.CORRECT);
		if (habit(area, facts)) {
			return allRight ? Optional.empty() : Optional.of(GapDirection.HABIT_AHEAD);
		}
		return allRight ? Optional.of(GapDirection.KNOWLEDGE_AHEAD) : Optional.empty();
	}

	/** A Jev label counts only when the rule finds the same gap in the area; otherwise aligned. */
	static Optional<GapDirection> checkedJevGap(GapDirection label, FocusArea area, List<Answer> inArea,
			FactsDto facts) {
		return ruleGap(area, inArea, facts).filter(label::equals);
	}

	/** The card about the start lesson's area first, then area order; at most MAX_GAP_CARDS cards. */
	static List<GapDto> gapCards(Map<FocusArea, GapDirection> gaps, FocusArea startLessonArea) {
		return gaps.entrySet().stream()
			.sorted(Comparator.comparing(gap -> gap.getKey() != startLessonArea))
			.limit(MAX_GAP_CARDS)
			.map(gap -> new GapDto(gap.getKey(), gap.getValue(),
				because(gap.getKey(), gap.getValue(), startLessonArea)))
			.toList();
	}

	private static String because(FocusArea area, GapDirection direction, FocusArea startLessonArea) {
		boolean saving = area == FocusArea.SAVING;
		if (direction == GapDirection.KNOWLEDGE_AHEAD) {
			return "Your %s answers show you understand how it works. Your account shows %s.".formatted(
					area.getLabel(), saving ? "no monthly transfer to savings" : "no investment products");
		}
		String end = area == startLessonArea ? "open, which is where your first lesson starts." : "open to explore.";
		return "Your account shows you %s. Your %s answers leave a few things %s".formatted(
				saving ? "move money to savings every month" : "already invest", area.getLabel(), end);
	}

	/** The questions' lessons, each once, in the questions' order. */
	static List<CheckLesson> lessons(List<CheckQuestion> questions, Function<CheckQuestion, CheckLesson> toLesson) {
		Map<String, CheckLesson> lessons = new LinkedHashMap<>();
		questions.forEach(q -> lessons.computeIfAbsent(q.lessonId(), id -> toLesson.apply(q)));
		return List.copyOf(lessons.values());
	}

	static Optional<Story> storyOf(String lessonId, List<Story> stories) {
		return stories.stream().filter(s -> s.lessonIds().contains(lessonId)).findFirst();
	}

	/** The story's first lesson in story order that is not completed; empty when all are done. */
	static Optional<String> startLesson(Story story, Set<String> completed) {
		return story.lessonIds().stream().filter(id -> !completed.contains(id)).findFirst();
	}

	/** The area a story teaches; null for a story without a quiz. */
	static FocusArea areaOf(Story story, List<CheckLesson> lessons) {
		return lessons.stream().filter(l -> l.storyId().equals(story.id())).findFirst().map(CheckLesson::area)
			.orElse(null);
	}

	/** Lessons of non-Solid areas whose story has a lesson left, in path order: answered areas weakest first. */
	static List<CheckLesson> candidates(List<CheckLesson> lessons, List<Story> stories, List<FocusArea> order,
			Map<FocusArea, Double> mastery, List<Answer> answers, Set<String> completed) {
		Comparator<CheckLesson> pathOrder = Comparator
			.comparing((CheckLesson l) -> inArea(answers, l.area()).isEmpty())
			.thenComparing(l -> inArea(answers, l.area()).isEmpty() ? 0 : masteryOrStart(mastery, l.area()))
			.thenComparing(l -> order.indexOf(l.area()));
		// The sort is stable, so lessons of one area stay in story order.
		return lessons.stream()
			.filter(l -> order.contains(l.area()) && !solid(l.area(), mastery, answers)
					&& storyOf(l.id(), stories).flatMap(s -> startLesson(s, completed)).isPresent())
			.sorted(pathOrder)
			.toList();
	}

	/** The candidates' stories, each once, in candidate order. */
	static List<Story> stories(List<CheckLesson> candidates, List<Story> stories) {
		return candidates.stream().flatMap(l -> storyOf(l.id(), stories).stream()).distinct().toList();
	}

	/** Jev and the rule pick from answered areas when any have a candidate. */
	static List<CheckLesson> pool(List<CheckLesson> candidates, List<Answer> answers) {
		List<CheckLesson> answered = candidates.stream().filter(l -> !inArea(answers, l.area()).isEmpty()).toList();
		return answered.isEmpty() ? candidates : answered;
	}

	/**
	 * What Jev chooses the first lesson from: per area of the pool, lessons not completed, those with an answer that
	 * was not right first, then across the area's stories. Empty below two: one lesson needs no question.
	 */
	static List<CheckLesson> firstLessonChoices(List<CheckLesson> pool, List<Answer> answers, Set<String> completed) {
		Comparator<CheckLesson> gapFirst = Comparator.comparing(l -> answers.stream()
			.noneMatch(a -> a.result() != AnswerResult.CORRECT && a.question().lessonId().equals(l.id())));
		List<CheckLesson> choices = pool.stream().map(CheckLesson::area).distinct()
			.flatMap(area -> acrossStories(pool.stream()
				.filter(l -> l.area() == area && !completed.contains(l.id()))
				.toList()).stream()
				.sorted(gapFirst)
				.limit(LESSON_CHOICES_PER_AREA))
			.toList();
		return choices.size() < JevConsts.MIN_CHOICE_LABELS ? List.of() : choices;
	}

	static CheckLesson ruleFirstLesson(List<CheckLesson> pool, List<FocusArea> order, Map<FocusArea, Double> mastery,
			List<Answer> answers) {
		FocusArea weakest = pool.stream()
			.map(CheckLesson::area)
			.min(Comparator.comparing((FocusArea area) -> masteryOrStart(mastery, area)).thenComparing(order::indexOf))
			.orElseThrow();
		List<CheckLesson> inWeakest = pool.stream().filter(l -> l.area() == weakest).toList();
		// min keeps the first of equal scores, so a tie goes to the earlier answer.
		return inArea(answers, weakest).stream()
			.filter(a -> inWeakest.stream().anyMatch(l -> l.id().equals(a.question().lessonId())))
			.min(Comparator.comparingDouble(Answer::score))
			.flatMap(a -> inWeakest.stream().filter(l -> l.id().equals(a.question().lessonId())).findFirst())
			.orElse(inWeakest.getFirst());
	}

	/**
	 * The path starts in the story of the picked lesson (Jev's, else the rule's). The app opens a story's lessons in
	 * order, so the start lesson itself is that story's first lesson not completed.
	 */
	static StoryPlan plan(List<Story> stories, List<CheckLesson> candidates, CheckLesson picked, List<FocusArea> order,
			Map<FocusArea, Double> mastery, List<Answer> answers, Set<String> completed) {
		if (candidates.isEmpty()) {
			Optional<Story> next = stories.stream().filter(s -> startLesson(s, completed).isPresent()).findFirst();
			return new StoryPlan(next.orElse(null), null, order.stream().allMatch(area -> solid(area, mastery, answers)),
					next.map(s -> List.of(s.id())).orElse(List.of()));
		}
		CheckLesson lesson = picked != null ? picked
				: ruleFirstLesson(pool(candidates, answers), order, mastery, answers);
		Story start = storyOf(lesson.id(), stories).orElseThrow();
		List<String> path = new ArrayList<>(List.of(start.id()));
		stories(candidates, stories).stream().map(Story::id).filter(id -> !id.equals(start.id())).forEach(path::add);
		return new StoryPlan(start, lesson.area(), false, path);
	}

	private static double masteryOrStart(Map<FocusArea, Double> mastery, FocusArea area) {
		return Objects.requireNonNullElse(mastery.get(area), RULE_START);
	}

}
