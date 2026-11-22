package com.collabothon.back.categorization.controllers;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** History entries and Jev labels for the Quick check's questions, read from the lesson files the pool is built from. */
final class TestPool {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	static String right(String questionId) {
		return entry(questionId, correct(questionId));
	}

	static String wrong(String questionId) {
		return entry(questionId, correct(questionId) == 0 ? 1 : 0);
	}

	static String notSure(String questionId) {
		return entry(questionId, null);
	}

	static String history(String... entries) {
		return String.join(", ", entries);
	}

	/** Jev's option name for a lesson, written out again here so the format is pinned. */
	static String label(String lessonId) {
		return topic(lessonId).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
	}

	static String criterion(String lessonId) {
		return "%s. Covers: %s.".formatted(topic(lessonId), String.join(", ", concepts(lessonId)).replace('-', ' '));
	}

	static String topic(String lessonId) {
		return lesson(lessonId).path("topic").asString();
	}

	static List<String> concepts(String lessonId) {
		List<String> concepts = new ArrayList<>();
		lesson(lessonId).path("concepts").forEach(c -> concepts.add(c.asString()));
		return concepts;
	}

	/** An answer as the Jev state carries it. */
	static String jevAnswer(String area, String lessonId, String result) {
		ObjectNode answer = JSON.createObjectNode();
		answer.put("area", area);
		answer.put("lessonId", lessonId);
		answer.put("topic", topic(lessonId));
		answer.set("concepts", JSON.valueToTree(concepts(lessonId)));
		answer.put("result", result);
		return answer.toString();
	}

	/** A picked path as the Jev state carries it. */
	static String interest(String storyId) {
		for (JsonNode story : read("/content/stories.json")) {
			if (story.path("id").asString().equals(storyId)) {
				return JSON.createObjectNode()
					.put("category", story.path("category").asString())
					.put("topic", story.path("topic").asString())
					.toString();
			}
		}
		throw new IllegalArgumentException(storyId);
	}

	private static String entry(String questionId, Integer optionIndex) {
		return "{\"questionId\": \"%s\", \"optionIndex\": %s}".formatted(questionId, optionIndex);
	}

	private static int correct(String questionId) {
		String[] ids = questionId.split("/");
		for (JsonNode step : lesson(ids[0]).path("steps")) {
			if (step.path("id").asString().equals(ids[1])) {
				return step.path("correctIndex").asInt();
			}
		}
		throw new IllegalArgumentException(questionId);
	}

	private static JsonNode lesson(String lessonId) {
		return read("/content/lessons/" + lessonId + ".json");
	}

	private static JsonNode read(String resource) {
		try (InputStream in = TestPool.class.getResourceAsStream(resource)) {
			return JSON.readTree(in);
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

}
