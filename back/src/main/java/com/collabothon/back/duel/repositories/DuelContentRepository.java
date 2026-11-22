package com.collabothon.back.duel.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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
 * Duel questions from {@code content/duel/*.json}, loaded and validated once at startup, so broken content
 * stops the backend instead of breaking a duel mid-demo. Every question points at a lesson of the same story.
 */
@Repository
@Slf4j
public class DuelContentRepository {

	private static final String CONTENT_PATTERN = "classpath*:content/duel/*.json";

	private final Map<String, List<DuelQuestion>> questionsByStory = new LinkedHashMap<>();
	private final Map<String, DuelQuestion> questionsById = new LinkedHashMap<>();

	public DuelContentRepository(JsonMapper json, LessonContentRepository lessons) throws IOException {
		DuelContentParser parser = new DuelContentParser(lessonId -> lessons.findById(lessonId).map(LessonContentItem::story));
		for (Resource file : new PathMatchingResourcePatternResolver().getResources(CONTENT_PATTERN)) {
			if (!file.isReadable()) {
				continue;
			}
			List<DuelQuestion> questions = parser.parse(file.getFilename(), read(json, file));
			if (!questions.isEmpty()) {
				String story = questions.getFirst().category();
				questionsByStory.put(story, questions);
				for (DuelQuestion q : questions) {
					questionsById.put(q.id(), q);
				}
			}
		}
		if (questionsByStory.isEmpty()) {
			log.info("No duel content files found in content/duel/*.json");
		}
	}

	public boolean hasDuelContent(String story) {
		return questionsByStory.containsKey(story);
	}

	public Set<String> storiesWithDuelContent() {
		return Collections.unmodifiableSet(questionsByStory.keySet());
	}

	public Map<String, List<DuelQuestion>> findAllByStory() {
		return Collections.unmodifiableMap(questionsByStory);
	}

	/** Questions of a story in file order; empty if the story has no duel content. */
	public List<DuelQuestion> findByStory(String story) {
		return questionsByStory.getOrDefault(story, List.of());
	}

	public Optional<DuelQuestion> findById(String id) {
		return Optional.ofNullable(questionsById.get(id));
	}

	private static JsonNode read(JsonMapper json, Resource resource) throws IOException {
		try (InputStream in = resource.getInputStream()) {
			return json.readTree(in);
		}
	}

}
