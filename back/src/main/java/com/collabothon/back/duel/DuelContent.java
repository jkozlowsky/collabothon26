package com.collabothon.back.duel;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import com.collabothon.back.lesson.LessonContent;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Loads and validates duel content from {@code content/duel/*.json}.
 * Startup fails fast if content violates the duel validation rules (contract §5).
 */
@Component
public class DuelContent {

	private static final Logger log = LoggerFactory.getLogger(DuelContent.class);

	public static final Set<String> ALLOWED_TYPES = Set.of("quiz", "predict", "chart", "sort", "match");

	public static final Set<String> MODELS = Set.of("drawdownRecovery", "leverage", "oneCompanyCrash", "realValue",
			"installmentCost", "countryMix");

	private final Map<String, List<QuestionDef>> stories = new LinkedHashMap<>();

	public DuelContent(JsonMapper json, LessonContent lessonContent) throws IOException {
		var resolver = new PathMatchingResourcePatternResolver();
		Resource[] resources = resolver.getResources("classpath*:content/duel/*.json");
		for (Resource file : resources) {
			if (!file.isReadable()) {
				continue;
			}
			String filename = file.getFilename();
			ObjectNode root = (ObjectNode) read(json, file);
			String story = root.path("story").asString("");
			if (story.isBlank()) {
				throw new IllegalStateException("File " + filename + " is missing story property");
			}
			List<QuestionDef> list = new ArrayList<>();
			Set<String> questionIds = new HashSet<>();
			Set<String> stepIds = new HashSet<>();
			JsonNode questionsNode = root.path("questions");
			if (!questionsNode.isArray() || questionsNode.isEmpty()) {
				throw new IllegalStateException("File " + filename + " has no questions");
			}
			for (JsonNode qNode : questionsNode) {
				String qid = qNode.path("id").asString("");
				if (qid.isBlank() || !questionIds.add(qid)) {
					throw new IllegalStateException("File " + filename + ": missing or duplicate question id '" + qid + "'");
				}
				String lessonId = qNode.path("lessonId").asString("");
				if (lessonId.isBlank()) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": missing lessonId");
				}
				var lessonOpt = lessonContent.lesson(lessonId);
				if (lessonOpt.isEmpty()) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": lessonId '" + lessonId + "' does not exist");
				}
				String lessonStory = lessonOpt.get().path("story").asString("");
				if (!story.equals(lessonStory)) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": lesson '" + lessonId
							+ "' belongs to story '" + lessonStory + "', not '" + story + "'");
				}
				Long timeLimitMs = qNode.hasNonNull("timeLimitMs") ? qNode.get("timeLimitMs").asLong() : null;

				JsonNode stepNode = qNode.path("step");
				if (!stepNode.isObject()) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": missing step object");
				}
				ObjectNode step = (ObjectNode) stepNode;
				String stepId = step.path("id").asString("");
				if (stepId.isBlank() || !stepIds.add(stepId)) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": missing or duplicate step id '" + stepId + "'");
				}
				String type = step.path("type").asString("");
				if (!ALLOWED_TYPES.contains(type)) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": type '" + type + "' is not allowed in duels");
				}

				validateStep(filename, qid, type, step);
				list.add(new QuestionDef(qid, lessonId, timeLimitMs, story, step));
			}
			stories.put(story, List.copyOf(list));
		}
		if (stories.isEmpty()) {
			log.info("No duel content files found in content/duel/*.json");
		}
	}

	public List<QuestionDef> getStoryQuestions(String story) {
		return stories.getOrDefault(story, List.of());
	}

	public List<QuestionDef> getDemoQuestions() {
		List<QuestionDef> berlin = stories.get("berlin");
		if (berlin == null || berlin.isEmpty()) {
			throw new IllegalStateException("Duel content for berlin is not loaded");
		}
		return berlin;
	}

	public boolean hasContent(String story) {
		return stories.containsKey(story);
	}

	private static JsonNode read(JsonMapper json, Resource resource) throws IOException {
		try (InputStream in = resource.getInputStream()) {
			return json.readTree(in);
		}
	}

	private void validateStep(String filename, String qid, String type, ObjectNode step) {
		String prefix = "File " + filename + ", question " + qid + " (" + type + "): ";
		switch (type) {
			case "quiz" -> {
				JsonNode options = step.path("options");
				if (!options.isArray() || options.size() < 2 || options.size() > 4) {
					throw new IllegalStateException(prefix + "quiz must have 2..4 options");
				}
				if (!step.hasNonNull("correctIndex")) {
					throw new IllegalStateException(prefix + "quiz must have correctIndex");
				}
				int ci = step.path("correctIndex").asInt(-1);
				if (ci < 0 || ci >= options.size()) {
					throw new IllegalStateException(prefix + "correctIndex " + ci + " out of bounds");
				}
			}
			case "predict" -> {
				validateRangeAndTolerance(prefix, step);
			}
			case "chart" -> {
				String model = step.path("model").asString("");
				if (!MODELS.contains(model)) {
					throw new IllegalStateException(prefix + "unknown chart model '" + model + "'");
				}
				validateRangeAndTolerance(prefix, step);
			}
			case "sort" -> {
				JsonNode items = step.path("items");
				if (!items.isArray() || items.size() < 2) {
					throw new IllegalStateException(prefix + "sort must have >= 2 items");
				}
			}
			case "match" -> {
				JsonNode pairs = step.path("pairs");
				if (!pairs.isArray() || pairs.size() < 2) {
					throw new IllegalStateException(prefix + "match must have >= 2 pairs");
				}
			}
		}
	}

	private void validateRangeAndTolerance(String prefix, ObjectNode step) {
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
		double answer = step.path("answer").asDouble();
		JsonNode input = step.path("input");
		if (input.isObject() && input.hasNonNull("min") && input.hasNonNull("max")) {
			double min = input.path("min").asDouble();
			double max = input.path("max").asDouble();
			if (answer < min || answer > max) {
				throw new IllegalStateException(prefix + "answer " + answer + " outside input range [" + min + ", " + max + "]");
			}
		}
	}

	public static ObjectNode stripAnswerFields(ObjectNode step) {
		ObjectNode copy = step.deepCopy();
		String type = copy.path("type").asString();
		switch (type) {
			case "quiz" -> {
				copy.remove("correctIndex");
				copy.remove("explanation");
			}
			case "predict" -> {
				copy.remove("answer");
				copy.remove("reveal");
				copy.remove("tolerance");
				copy.remove("explanation");
			}
			case "chart" -> {
				copy.remove("answer");
				copy.remove("tolerance");
				copy.remove("explanation");
			}
			default -> copy.remove("explanation");
		}
		return copy;
	}

	public record QuestionDef(
			String id,
			String lessonId,
			Long timeLimitMs,
			String category,
			ObjectNode step
	) {
	}

}
