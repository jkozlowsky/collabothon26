package com.collabothon.back.lesson.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.glossary.repositories.GlossaryContentRepository;
import com.collabothon.back.lesson.services.LessonRules;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Repository
public class LessonContentRepository {

	private final Map<String, ObjectNode> lessons = new LinkedHashMap<>();
	private final Map<String, LessonContentItem> lessonItems = new LinkedHashMap<>();
	private final StoryRepository storyRepo;

	public LessonContentRepository(JsonMapper json, GlossaryContentRepository glossaryRepo, StoryRepository storyRepo) throws IOException {
		this.storyRepo = storyRepo;
		var resolver = new PathMatchingResourcePatternResolver();
		Set<String> concepts = glossaryRepo.concepts();

		for (Resource file : resolver.getResources("classpath:content/lessons/*.json")) {
			ObjectNode lesson;
			try (InputStream in = file.getInputStream()) {
				lesson = (ObjectNode) json.readTree(in);
			}
			LessonRules.validate(lesson, concepts);
			String id = lesson.path("id").asString();
			String expectedFilename = id + ".json";
			if (!expectedFilename.equals(file.getFilename())) {
				throw new IllegalStateException("Lesson file " + file.getFilename() + " must hold lesson id " + id);
			}
			if (lessons.put(id, lesson) != null) {
				throw new IllegalStateException("Duplicate lesson id " + id);
			}

			List<String> lessonConcepts = new ArrayList<>();
			for (JsonNode c : lesson.path("concepts")) {
				lessonConcepts.add(c.asString());
			}

			LessonContentItem item = new LessonContentItem(
					id,
					lesson.path("story").asString(""),
					lesson.path("title").asString(""),
					lesson.path("place").asString(""),
					lesson.path("topic").asString(null),
					lesson.path("minutes").asInt(0),
					lesson.path("xp").asInt(0),
					lessonConcepts,
					lesson
			);
			lessonItems.put(id, item);
		}

		Set<String> listed = new HashSet<>();
		for (Story story : storyRepo.findAll()) {
			for (String lessonId : story.lessonIds()) {
				ObjectNode lesson = lessons.get(lessonId);
				if (lesson == null) {
					throw new IllegalStateException("Story " + story.id() + " lists lesson " + lessonId + " that is missing");
				}
				if (!story.id().equals(lesson.path("story").asString(""))) {
					throw new IllegalStateException("Story " + story.id() + " lists lesson " + lessonId + " belonging to another story");
				}
				if (!listed.add(lessonId)) {
					throw new IllegalStateException("Lesson " + lessonId + " listed twice");
				}
			}
		}

		if (!listed.equals(lessons.keySet())) {
			throw new IllegalStateException("Every lesson must be listed in exactly one story in stories.json");
		}
	}

	public Optional<LessonContentItem> findById(String lessonId) {
		if (lessonId == null) {
			return Optional.empty();
		}
		return Optional.ofNullable(lessonItems.get(lessonId));
	}

	public Optional<ObjectNode> findNodeById(String lessonId) {
		if (lessonId == null) {
			return Optional.empty();
		}
		return Optional.ofNullable(lessons.get(lessonId));
	}

	public Optional<ObjectNode> lesson(String id) {
		return findNodeById(id);
	}

	public List<JsonNode> stories() {
		return storyRepo.rawStories();
	}

	public Map<String, ObjectNode> allLessons() {
		return Collections.unmodifiableMap(lessons);
	}

	public List<String> lessonIdsOf(JsonNode story) {
		List<String> ids = new ArrayList<>();
		story.path("lessonIds").forEach(i -> ids.add(i.asString()));
		return ids;
	}

	public List<String> lessonIdsOfStory(String storyId) {
		List<String> ids = new ArrayList<>();
		for (LessonContentItem item : lessonItems.values()) {
			if (item.story().equals(storyId)) {
				ids.add(item.id());
			}
		}
		return ids;
	}
}
