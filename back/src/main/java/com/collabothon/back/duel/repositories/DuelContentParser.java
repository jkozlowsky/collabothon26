package com.collabothon.back.duel.repositories;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Parses and validates one {@code content/duel/<story>.json} file. Pure (no I/O), so the rules are unit-tested
 * directly; {@link DuelContentRepository} runs it on every file at startup.
 */
public final class DuelContentParser {

	public static final Set<String> ALLOWED_TYPES = Set.of("quiz", "predict", "chart", "sort", "match");

	public static final Set<String> CHART_MODELS = Set.of("drawdownRecovery", "leverage", "oneCompanyCrash",
			"realValue", "installmentCost", "countryMix");

	private static final int MIN_QUIZ_OPTIONS = 2;

	private static final int MAX_QUIZ_OPTIONS = 4;

	private static final int MIN_ITEMS = 2;

	private final Function<String, Optional<String>> lessonStoryLookup;

	/** @param lessonStoryLookup lesson id to the id of the story the lesson belongs to; empty if no such lesson */
	public DuelContentParser(Function<String, Optional<String>> lessonStoryLookup) {
		this.lessonStoryLookup = lessonStoryLookup;
	}

	/** Parses and validates one content file; every question's category is the file's story. */
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
			if (!questionIds.add(question.id())) {
				throw new IllegalStateException(
						"File " + fileName + ": missing or duplicate question id '" + question.id() + "'");
			}
			String stepId = question.step().path("id").asString("");
			if (!stepIds.add(stepId)) {
				throw new IllegalStateException("File " + fileName + ", question " + question.id()
						+ ": missing or duplicate step id '" + stepId + "'");
			}
			questions.add(question);
		}
		return List.copyOf(questions);
	}

	private DuelQuestion parseQuestion(String fileName, String story, JsonNode node) {
		String id = node.path("id").asString("");
		if (id.isBlank()) {
			throw new IllegalStateException("File " + fileName + ": missing or duplicate question id '" + id + "'");
		}
		String prefix = "File " + fileName + ", question " + id;
		String lessonId = node.path("lessonId").asString("");
		validateLesson(prefix, story, lessonId);
		JsonNode stepNode = node.path("step");
		if (!stepNode.isObject()) {
			throw new IllegalStateException(prefix + ": missing step object");
		}
		ObjectNode step = (ObjectNode) stepNode;
		String stepId = step.path("id").asString("");
		if (stepId.isBlank()) {
			throw new IllegalStateException(prefix + ": missing or duplicate step id '" + stepId + "'");
		}
		String type = step.path("type").asString("");
		if (!ALLOWED_TYPES.contains(type)) {
			throw new IllegalStateException(prefix + ": type '" + type + "' is not allowed in duels");
		}
		validateStep(prefix + " (" + type + "): ", type, step);
		return new DuelQuestion(id, lessonId, timeLimitOverride(node), story, step);
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

	private static Long timeLimitOverride(JsonNode question) {
		if (!question.hasNonNull("timeLimitMs")) {
			return null;
		}
		return question.get("timeLimitMs").asLong();
	}

	private static void validateStep(String prefix, String type, ObjectNode step) {
		switch (type) {
			case "quiz" -> validateQuiz(prefix, step);
			case "predict" -> validateRangeAndTolerance(prefix, step);
			case "chart" -> {
				String model = step.path("model").asString("");
				if (!CHART_MODELS.contains(model)) {
					throw new IllegalStateException(prefix + "unknown chart model '" + model + "'");
				}
				validateRangeAndTolerance(prefix, step);
			}
			case "sort" -> requireMinSize(prefix, step.path("items"), "sort must have >= 2 items");
			case "match" -> requireMinSize(prefix, step.path("pairs"), "match must have >= 2 pairs");
			default -> throw new IllegalStateException(prefix + "type '" + type + "' is not allowed in duels");
		}
	}

	private static void validateQuiz(String prefix, ObjectNode step) {
		JsonNode options = step.path("options");
		if (!options.isArray() || options.size() < MIN_QUIZ_OPTIONS || options.size() > MAX_QUIZ_OPTIONS) {
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

	private static void requireMinSize(String prefix, JsonNode array, String message) {
		if (!array.isArray() || array.size() < MIN_ITEMS) {
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
		if (!input.isObject() || !input.hasNonNull("min") || !input.hasNonNull("max")) {
			return;
		}
		double answer = step.path("answer").asDouble();
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
