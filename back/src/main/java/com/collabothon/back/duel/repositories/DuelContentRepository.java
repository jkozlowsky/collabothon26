package com.collabothon.back.duel.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Duel questions from {@code content/duel/<story>.json}, loaded and validated once at startup, so broken content
 * stops the backend instead of breaking a duel mid-demo. Every question points at a lesson of the same story.
 */
@Repository
@Slf4j
public class DuelContentRepository {

	/** The story whose questions every match uses until the other stories get duel content. */
	public static final String MATCH_STORY = "berlin";

	private static final String CONTENT_PATTERN = "classpath*:content/duel/*.json";

	private final Map<String, List<DuelQuestion>> questionsByStory = new LinkedHashMap<>();

	public DuelContentRepository(JsonMapper json, LessonContentRepository lessons) throws IOException {
		DuelContentParser parser = new DuelContentParser(lessonId -> lessons.findById(lessonId).map(LessonContentItem::story));
		for (Resource file : new PathMatchingResourcePatternResolver().getResources(CONTENT_PATTERN)) {
			if (!file.isReadable()) {
				continue;
			}
			List<DuelQuestion> questions = parser.parse(file.getFilename(), read(json, file));
			questionsByStory.put(questions.getFirst().category(), questions);
		}
		if (questionsByStory.isEmpty()) {
			log.info("No duel content files found in content/duel/*.json");
		}
	}

	/** Questions of a story in file order; empty if the story has no duel content. */
	public List<DuelQuestion> findByStory(String story) {
		return questionsByStory.getOrDefault(story, List.of());
	}

	/** The questions every match plays, in order. */
	public List<DuelQuestion> findMatchQuestions() {
		List<DuelQuestion> questions = findByStory(MATCH_STORY);
		if (questions.isEmpty()) {
			throw new IllegalStateException("Duel content for " + MATCH_STORY + " is not loaded");
		}
		return questions;
	}

	private static JsonNode read(JsonMapper json, Resource resource) throws IOException {
		try (InputStream in = resource.getInputStream()) {
			return json.readTree(in);
		}
	}

}
