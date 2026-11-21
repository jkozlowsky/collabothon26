package com.collabothon.back.lesson;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Stories, lessons and glossary from JSON files in {@code resources/content}. Loaded once at startup and
 * validated there, so a broken content file stops the backend instead of breaking a lesson mid-demo.
 * Fixing content = edit the JSON and restart; no migration.
 */
@Component
public class LessonContent {

	private final Map<String, ObjectNode> lessons = new LinkedHashMap<>();

	private final List<JsonNode> stories = new ArrayList<>();

	private final ObjectNode glossary;

	LessonContent(JsonMapper json) throws IOException {
		var resolver = new PathMatchingResourcePatternResolver();
		glossary = (ObjectNode) read(json, resolver.getResource("classpath:content/glossary.json"));
		Set<String> concepts = new HashSet<>(glossary.propertyNames());

		for (Resource file : resolver.getResources("classpath:content/lessons/*.json")) {
			ObjectNode lesson = (ObjectNode) read(json, file);
			LessonRules.validate(lesson, concepts);
			String id = lesson.path("id").asString();
			if (!(id + ".json").equals(file.getFilename()) || lessons.put(id, lesson) != null) {
				throw new IllegalStateException("Lesson file " + file.getFilename() + " must hold lesson id " + id);
			}
		}

		Set<String> listed = new HashSet<>();
		for (JsonNode story : read(json, resolver.getResource("classpath:content/stories.json"))) {
			stories.add(story);
			for (JsonNode lessonId : story.path("lessonIds")) {
				ObjectNode lesson = lessons.get(lessonId.asString());
				if (lesson == null || !story.path("id").asString().equals(lesson.path("story").asString())
						|| !listed.add(lessonId.asString())) {
					throw new IllegalStateException("Story " + story.path("id").asString() + " lists lesson "
							+ lessonId.asString() + " that is missing, listed twice or belongs to another story");
				}
			}
		}
		if (!listed.equals(lessons.keySet())) {
			throw new IllegalStateException("Every lesson must be listed in exactly one story in stories.json");
		}
	}

	private static JsonNode read(JsonMapper json, Resource resource) throws IOException {
		try (InputStream in = resource.getInputStream()) {
			return json.readTree(in);
		}
	}

	public Optional<ObjectNode> lesson(String id) {
		return Optional.ofNullable(lessons.get(id));
	}

	public List<JsonNode> stories() {
		return stories;
	}

	public JsonNode story(String id) {
		return stories.stream().filter(s -> s.path("id").asString().equals(id)).findFirst().orElseThrow();
	}

	/** Lesson ids of the lesson's story, in order. */
	public List<String> lessonIdsOf(JsonNode story) {
		List<String> ids = new ArrayList<>();
		story.path("lessonIds").forEach(i -> ids.add(i.asString()));
		return ids;
	}

	ObjectNode glossary() {
		return glossary;
	}

}
