package com.collabothon.back.duel.repositories;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

import com.collabothon.back.duel.consts.DuelStepConsts;
import com.collabothon.back.duel.models.DuelQuestion;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@RequiredArgsConstructor
public final class DuelContentParser {

	private final Function<String, Optional<String>> lessonStoryLookup;

	/** Every question's category is the file's story. */
	public List<DuelQuestion> parse(String fileName, JsonNode root) {
		String story = root.path("story").asString("");
		if (story.isBlank()) {
			throw new IllegalStateException("File " + fileName + " is missing story property");
		}
		JsonNode questionNodes = root.path("questions");
		if (!questionNodes.isArray() || questionNodes.isEmpty()) {
			throw new IllegalStateException("File " + fileName + " has no questions");
		}
		Set<String> questionIds = new HashSet<>();
		Set<String> stepIds = new HashSet<>();
		List<DuelQuestion> questions = new ArrayList<>();
		for (JsonNode node : questionNodes) {
			DuelQuestion question = parseQuestion(fileName, story, node);
			requireNewQuestionId(fileName, question, questionIds);
			requireNewStepId(fileName, question, stepIds);
			questions.add(question);
		}
		return List.copyOf(questions);
	}

	private static void requireNewQuestionId(String fileName, DuelQuestion question, Set<String> questionIds) {
		if (!questionIds.add(question.id())) {
			throw new IllegalStateException(
					"File " + fileName + ": missing or duplicate question id '" + question.id() + "'");
		}
	}

	private static void requireNewStepId(String fileName, DuelQuestion question, Set<String> stepIds) {
		String stepId = question.step().path("id").asString("");
		if (!stepIds.add(stepId)) {
			throw new IllegalStateException("File " + fileName + ", question " + question.id()
					+ ": missing or duplicate step id '" + stepId + "'");
		}
	}

	private DuelQuestion parseQuestion(String fileName, String story, JsonNode node) {
		String id = node.path("id").asString("");
		if (id.isBlank()) {
			throw new IllegalStateException("File " + fileName + ": missing or duplicate question id '" + id + "'");
		}
		String prefix = "File " + fileName + ", question " + id;
		String lessonId = node.path("lessonId").asString("");
		validateLesson(prefix, story, lessonId);
		ObjectNode step = parseStep(prefix, node.path("step"));
		return new DuelQuestion(id, lessonId, node.path("sourceStepId").asString(null),
				parseConcepts(node.path("concepts")), timeLimitOverride(node), story, step);
	}

	private void validateLesson(String prefix, String story, String lessonId) {
		if (lessonId.isBlank()) {
			throw new IllegalStateException(prefix + ": missing lessonId");
		}
		String lessonStory = lessonStoryLookup.apply(lessonId)
			.orElseThrow(() -> new IllegalStateException(prefix + ": lessonId '" + lessonId + "' does not exist"));
		if (!story.equals(lessonStory)) {
			throw new IllegalStateException(prefix + ": lesson '" + lessonId + "' belongs to story '" + lessonStory
					+ "', not '" + story + "'");
		}
	}

	private static ObjectNode parseStep(String prefix, JsonNode node) {
		if (!(node instanceof ObjectNode step)) {
			throw new IllegalStateException(prefix + ": missing step object");
		}
		String stepId = step.path("id").asString("");
		if (stepId.isBlank()) {
			throw new IllegalStateException(prefix + ": missing or duplicate step id '" + stepId + "'");
		}
		validateStep(prefix, step);
		return step;
	}

	private static List<String> parseConcepts(JsonNode node) {
		if (!node.isArray()) {
			return List.of();
		}
		List<String> concepts = new ArrayList<>();
		for (JsonNode concept : node) {
			if (!concept.isNull()) {
				concepts.add(concept.asString(""));
			}
		}
		return List.copyOf(concepts);
	}

	private static Long timeLimitOverride(JsonNode question) {
		if (!question.hasNonNull("timeLimitMs")) {
			return null;
		}
		return question.get("timeLimitMs").asLong();
	}

	private static void validateStep(String prefix, ObjectNode step) {
		String type = step.path("type").asString("");
		String stepPrefix = prefix + " (" + type + "): ";
		switch (type) {
			case DuelStepConsts.QUIZ -> validateQuiz(stepPrefix, step);
			case DuelStepConsts.PREDICT -> validateRangeAndTolerance(stepPrefix, step);
			case DuelStepConsts.CHART -> validateChart(stepPrefix, step);
			case DuelStepConsts.SORT -> requireMinSize(stepPrefix, step.path("items"), "sort must have >= 2 items");
			case DuelStepConsts.MATCH -> requireMinSize(stepPrefix, step.path("pairs"), "match must have >= 2 pairs");
			default -> throw new IllegalStateException(prefix + ": type '" + type + "' is not allowed in duels");
		}
	}

	private static void validateQuiz(String prefix, ObjectNode step) {
		JsonNode options = step.path("options");
		if (!options.isArray() || options.size() < DuelStepConsts.MIN_QUIZ_OPTIONS
				|| options.size() > DuelStepConsts.MAX_QUIZ_OPTIONS) {
			throw new IllegalStateException(prefix + "quiz must have 2..4 options");
		}
		if (!step.hasNonNull("correctIndex")) {
			throw new IllegalStateException(prefix + "quiz must have correctIndex");
		}
		int correctIndex = step.path("correctIndex").asInt(-1);
		if (correctIndex < 0 || correctIndex >= options.size()) {
			throw new IllegalStateException(prefix + "correctIndex " + correctIndex + " out of bounds");
		}
	}

	private static void validateChart(String prefix, ObjectNode step) {
		String model = step.path("model").asString("");
		if (!DuelStepConsts.CHART_MODELS.contains(model)) {
			throw new IllegalStateException(prefix + "unknown chart model '" + model + "'");
		}
		validateRangeAndTolerance(prefix, step);
	}

	private static void requireMinSize(String prefix, JsonNode array, String message) {
		if (!array.isArray() || array.size() < DuelStepConsts.MIN_ITEMS) {
			throw new IllegalStateException(prefix + message);
		}
	}

	private static void validateRangeAndTolerance(String prefix, ObjectNode step) {
		if (!step.hasNonNull("tolerance")) {
			throw new IllegalStateException(prefix + "missing tolerance");
		}
		double tolerance = step.path("tolerance").asDouble(0);
		if (tolerance <= 0) {
			throw new IllegalStateException(prefix + "tolerance must be positive, got " + tolerance);
		}
		if (!step.hasNonNull("answer")) {
			throw new IllegalStateException(prefix + "missing answer");
		}
		JsonNode input = step.path("input");
		if (input.isObject() && input.hasNonNull("min") && input.hasNonNull("max")) {
			validateInputRange(prefix, step.path("answer").asDouble(), tolerance, input);
		}
	}

	private static void validateInputRange(String prefix, double answer, double tolerance, JsonNode input) {
		double min = input.path("min").asDouble();
		double max = input.path("max").asDouble();
		if (answer < min || answer > max) {
			throw new IllegalStateException(
					prefix + "answer " + answer + " outside input range [" + min + ", " + max + "]");
		}
		if (Math.abs(answer - min) <= tolerance) {
			throw new IllegalStateException(
					prefix + "|answer (" + answer + ") - min (" + min + ")| <= tolerance (" + tolerance + ")");
		}
	}

}
