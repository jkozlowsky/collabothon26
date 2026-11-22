package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.CategorizationConsts.ENOUGH_THRESHOLD;
import static com.collabothon.back.categorization.consts.CategorizationConsts.LESSON_CHOICES_PER_AREA;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.MIN_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.RULE_MAX_QUESTIONS;
import static com.collabothon.back.categorization.consts.CategorizationConsts.SOLID_MIN_ANSWERS;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.random.RandomGenerator;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.CheckQuestion;
import com.collabothon.back.categorization.models.Measurement;
import com.collabothon.back.categorization.models.StepState;
import com.collabothon.back.lesson.models.Story;

final class NextQuestionRules {

	static List<CheckQuestion> open(List<CheckQuestion> pool, List<Answer> answers, Set<String> completed) {
		return pool.stream()
			.filter(question -> !completed.contains(question.lessonId())
					&& answers.stream().noneMatch(answer -> answer.question().id().equals(question.id())))
			.toList();
	}

	// The first question comes from a picked story while one has a question open.
	static List<CheckQuestion> askable(List<CheckQuestion> open, List<Answer> answers, List<Story> picked) {
		if (!answers.isEmpty()) {
			return open;
		}
		List<CheckQuestion> ofPicked = open.stream()
			.filter(question -> picked.stream().anyMatch(story -> story.id().equals(question.storyId())))
			.toList();
		if (ofPicked.isEmpty()) {
			return open;
		}
		return ofPicked;
	}

	static List<CheckLesson> nextLessonChoices(List<FocusArea> order, List<CheckLesson> open) {
		return order.stream()
			.flatMap(area -> OrderRules.acrossStories(open.stream().filter(lesson -> lesson.area() == area).toList())
				.stream()
				.limit(LESSON_CHOICES_PER_AREA))
			.toList();
	}

	static Optional<String> nextLesson(StepState state) {
		return afterMistake(state)
			.or(() -> inAreaWithoutAnswer(state))
			.or(() -> areaOneShortOfSolid(state).flatMap(area -> firstIn(state, area)))
			.or(() -> inWeakestArea(state))
			.map(CheckQuestion::lessonId);
	}

	// The same lesson while it has a question left, else a later one of its story.
	private static Optional<CheckQuestion> afterMistake(StepState state) {
		List<Answer> answers = state.measurement().answers();
		if (answers.isEmpty() || answers.getLast().isCorrect()) {
			return Optional.empty();
		}
		CheckQuestion last = answers.getLast().question();
		List<CheckQuestion> pool = state.pool();
		int lessonStart = pool.stream().map(CheckQuestion::lessonId).toList().indexOf(last.lessonId());
		return state.open().stream()
			.filter(question -> question.storyId().equals(last.storyId()) && pool.indexOf(question) >= lessonStart)
			.findFirst();
	}

	private static Optional<CheckQuestion> inAreaWithoutAnswer(StepState state) {
		Measurement measurement = state.measurement();
		return measurement.order().stream()
			.filter(area -> !measurement.isAnswered(area))
			.flatMap(area -> firstIn(state, area).stream())
			.findFirst();
	}

	private static Optional<CheckQuestion> inWeakestArea(StepState state) {
		Measurement measurement = state.measurement();
		return measurement.order().stream()
			.sorted(Comparator.comparingDouble(measurement::masteryOrStart))
			.flatMap(area -> firstIn(state, area).stream())
			.findFirst();
	}

	// A lesson not asked about goes first; min keeps the first of equals, so pool order decides the rest.
	private static Optional<CheckQuestion> firstIn(StepState state, FocusArea area) {
		List<Answer> answers = state.measurement().answers();
		return state.open().stream()
			.filter(question -> question.area() == area)
			.min(Comparator.comparing(question -> answers.stream()
				.anyMatch(answer -> answer.question().lessonId().equals(question.lessonId()))));
	}

	private static Optional<FocusArea> areaOneShortOfSolid(StepState state) {
		Measurement measurement = state.measurement();
		if (!measurement.isWithoutMistake()) {
			return Optional.empty();
		}
		return measurement.order().stream()
			.filter(area -> measurement.inArea(area).size() == SOLID_MIN_ANSWERS - 1 && hasQuestion(state, area))
			.findFirst();
	}

	private static boolean hasQuestion(StepState state, FocusArea area) {
		return state.open().stream().anyMatch(question -> question.area() == area);
	}

	static boolean ruleDone(StepState state) {
		Measurement measurement = state.measurement();
		int answered = measurement.answers().size();
		if (state.open().isEmpty() || answered >= ruleLimit(measurement)) {
			return true;
		}
		if (answered < MIN_QUESTIONS || areaOneShortOfSolid(state).isPresent()) {
			return false;
		}
		return measurement.order().stream().allMatch(area -> measurement.isAnswered(area) || !hasQuestion(state, area));
	}

	// A run without a mistake may go on to the maximum, so two answers per area can make every area Solid.
	private static int ruleLimit(Measurement measurement) {
		if (measurement.isWithoutMistake()) {
			return MAX_QUESTIONS;
		}
		return RULE_MAX_QUESTIONS;
	}

	static boolean jevDone(StepState state, double enough) {
		int answered = state.measurement().answers().size();
		if (state.open().isEmpty() || answered >= MAX_QUESTIONS) {
			return true;
		}
		return answered >= MIN_QUESTIONS && enough >= ENOUGH_THRESHOLD;
	}

	static CheckQuestion draw(List<CheckQuestion> open, String lessonId, RandomGenerator random) {
		List<CheckQuestion> ofLesson = open.stream().filter(question -> question.lessonId().equals(lessonId)).toList();
		return ofLesson.get(random.nextInt(ofLesson.size()));
	}

}
