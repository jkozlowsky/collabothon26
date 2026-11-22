package com.collabothon.back.categorization.services;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.consts.JevQuestionConsts;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.Measurement;
import com.collabothon.back.categorization.models.PathInput;
import com.collabothon.back.categorization.models.StoryPlan;
import com.collabothon.back.lesson.models.Story;

final class PathRules {

	// Without the Quick check nothing was measured, so the judged focus leads the path.
	static PathInput ledByFocus(PathInput input, List<FocusArea> focus) {
		Measurement measurement = input.measurement();
		if (measurement.ran()) {
			return input;
		}
		List<FocusArea> order = measurement.order();
		List<FocusArea> focusFirst = Stream.concat(focus.stream().filter(order::contains), order.stream())
			.distinct()
			.toList();
		return input.withMeasurement(measurement.withOrder(focusFirst));
	}

	// The app opens a story's lessons in order, so the start is the story's, not the picked lesson itself.
	static StoryPlan plan(PathInput input, Optional<CheckLesson> picked) {
		Measurement measurement = input.measurement();
		boolean readyForNext = measurement.order().stream().allMatch(measurement::isSolid);
		List<CheckLesson> candidates = candidates(input);
		if (picked.isEmpty() && candidates.isEmpty()) {
			return planWithNothingToLearn(input, readyForNext);
		}
		CheckLesson lesson = picked.orElseGet(() -> ruleFirstLesson(preferAnswered(candidates, measurement), input));
		List<Story> stories = input.stories();
		Story start = storyOf(lesson.id(), stories).orElseThrow();
		List<Story> others = candidates.stream()
			.flatMap(candidate -> storyOf(candidate.id(), stories).stream())
			.toList();
		return new StoryPlan(start, lesson.area(), readyForNext, path(start, others, input));
	}

	private static StoryPlan planWithNothingToLearn(PathInput input, boolean readyForNext) {
		return Stream.concat(input.picked().stream(), input.stories().stream())
			.filter(story -> startLesson(story, input.completed()).isPresent())
			.findFirst()
			.map(story -> new StoryPlan(story, null, readyForNext, path(story, List.of(), input)))
			.orElseGet(() -> new StoryPlan(null, null, readyForNext, List.of()));
	}

	// After a start outside the picks, the first picked path with a lesson left goes ahead of the others.
	private static List<String> path(Story start, List<Story> others, PathInput input) {
		Set<String> path = new LinkedHashSet<>(List.of(start.id()));
		if (!input.picked().contains(start)) {
			input.picked().stream()
				.filter(story -> startLesson(story, input.completed()).isPresent())
				.findFirst()
				.ifPresent(story -> path.add(story.id()));
		}
		others.forEach(story -> path.add(story.id()));
		return List.copyOf(path);
	}

	// Lessons of areas not Solid whose story has a lesson left: answered areas first, weakest first.
	private static List<CheckLesson> candidates(PathInput input) {
		Measurement measurement = input.measurement();
		List<FocusArea> order = measurement.order();
		Comparator<CheckLesson> pathOrder = Comparator
			.comparing((CheckLesson lesson) -> !measurement.isAnswered(lesson.area()))
			.thenComparingDouble(lesson -> answeredMastery(measurement, lesson.area()))
			.thenComparingInt(lesson -> order.indexOf(lesson.area()));
		// The sort is stable, so lessons of one area stay in pool order.
		return input.lessons().stream()
			.filter(lesson -> order.contains(lesson.area()) && !measurement.isSolid(lesson.area())
					&& hasLessonLeft(lesson, input))
			.sorted(pathOrder)
			.toList();
	}

	// Areas without an answer tie, whatever mastery the app sent for them.
	private static double answeredMastery(Measurement measurement, FocusArea area) {
		if (measurement.isAnswered(area)) {
			return measurement.masteryOrStart(area);
		}
		return CategorizationConsts.RULE_START;
	}

	private static boolean hasLessonLeft(CheckLesson lesson, PathInput input) {
		return storyOf(lesson.id(), input.stories())
			.flatMap(story -> startLesson(story, input.completed()))
			.isPresent();
	}

	private static List<CheckLesson> preferAnswered(List<CheckLesson> candidates, Measurement measurement) {
		List<CheckLesson> answered = candidates.stream()
			.filter(lesson -> measurement.isAnswered(lesson.area()))
			.toList();
		if (answered.isEmpty()) {
			return candidates;
		}
		return answered;
	}

	private static CheckLesson ruleFirstLesson(List<CheckLesson> pool, PathInput input) {
		Measurement measurement = input.measurement();
		List<Story> picked = input.picked();
		// Without a check every area ties, so the first picked story with a lesson left starts.
		CheckLesson first = pool.stream()
			.min(Comparator.comparingDouble((CheckLesson lesson) -> measurement.masteryOrStart(lesson.area()))
				.thenComparingInt(lesson -> OrderRules.pickRank(picked, lesson.storyId()))
				.thenComparingInt(lesson -> measurement.order().indexOf(lesson.area())))
			.orElseThrow();
		Map<String, CheckLesson> inWeakest = pool.stream()
			.filter(lesson -> lesson.area() == first.area())
			.collect(Collectors.toMap(CheckLesson::id, lesson -> lesson));
		// min keeps the first of equals, so a tie goes to the picked story, then to the earlier answer.
		return measurement.inArea(first.area()).stream()
			.filter(answer -> inWeakest.containsKey(answer.question().lessonId()))
			.min(Comparator.comparingDouble(Answer::score)
				.thenComparingInt(answer -> OrderRules.pickRank(picked, answer.question().storyId())))
			.map(answer -> inWeakest.get(answer.question().lessonId()))
			.orElse(first);
	}

	// Empty below two: one lesson needs no question.
	static List<CheckLesson> firstLessonChoices(PathInput input) {
		List<CheckLesson> pool = preferAnswered(candidates(input), input.measurement());
		Stream<CheckLesson> gapLessons = pool.stream()
			.map(CheckLesson::area)
			.distinct()
			.flatMap(area -> gapLessonsIn(area, pool, input).stream());
		List<CheckLesson> choices = Stream.concat(gapLessons, interestLessons(input).stream()).distinct().toList();
		if (choices.size() < JevConsts.MIN_CHOICE_LABELS) {
			return List.of();
		}
		return choices;
	}

	// Lessons with an answer that was not right first, then one per story.
	private static List<CheckLesson> gapLessonsIn(FocusArea area, List<CheckLesson> pool, PathInput input) {
		List<Answer> answers = input.measurement().answers();
		List<CheckLesson> left = pool.stream()
			.filter(lesson -> lesson.area() == area && !input.completed().contains(lesson.id()))
			.toList();
		return OrderRules.acrossStories(left).stream()
			.sorted(Comparator.comparing(lesson -> answers.stream()
				.noneMatch(answer -> !answer.isCorrect() && answer.question().lessonId().equals(lesson.id()))))
			.limit(CategorizationConsts.LESSON_CHOICES_PER_AREA)
			.toList();
	}

	private static List<CheckLesson> interestLessons(PathInput input) {
		return input.picked().stream().flatMap(story -> interestLesson(story, input).stream()).toList();
	}

	// The picked path's first quiz lesson left; in a Solid area the first one left that was not answered right.
	private static Optional<CheckLesson> interestLesson(Story story, PathInput input) {
		Measurement measurement = input.measurement();
		return input.lessons().stream()
			.filter(lesson -> lesson.storyId().equals(story.id()) && !input.completed().contains(lesson.id()))
			.filter(lesson -> !measurement.isSolid(lesson.area()) || !wasAnsweredRight(lesson, measurement.answers()))
			.findFirst();
	}

	private static boolean wasAnsweredRight(CheckLesson lesson, List<Answer> answers) {
		List<Answer> inLesson = answers.stream()
			.filter(answer -> answer.question().lessonId().equals(lesson.id()))
			.toList();
		return !inLesson.isEmpty() && inLesson.stream().allMatch(Answer::isCorrect);
	}

	static Map<String, String> interestNotes(PathInput input) {
		return interestLessons(input).stream()
			.collect(Collectors.toMap(CheckLesson::id, lesson -> interestNote(lesson, input.measurement())));
	}

	private static String interestNote(CheckLesson lesson, Measurement measurement) {
		if (measurement.isSolid(lesson.area())) {
			return JevQuestionConsts.SOLID_INTEREST_NOTE;
		}
		return JevQuestionConsts.INTEREST_NOTE;
	}

	private static Optional<Story> storyOf(String lessonId, List<Story> stories) {
		return stories.stream().filter(story -> story.lessonIds().contains(lessonId)).findFirst();
	}

	static Optional<String> startLesson(Story story, Set<String> completed) {
		return story.lessonIds().stream().filter(id -> !completed.contains(id)).findFirst();
	}

	// Null for a story without a quiz.
	static FocusArea areaOf(Story story, List<CheckLesson> lessons) {
		return lessons.stream()
			.filter(lesson -> lesson.storyId().equals(story.id()))
			.findFirst()
			.map(CheckLesson::area)
			.orElse(null);
	}

}
