package com.collabothon.back.duel.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
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
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Duel questions from {@code content/duel/*.json}, loaded and validated once at startup, so broken content
 * stops the backend instead of breaking a duel mid-demo. Questions are grouped by their area slug per Duel v4.
 */
@Repository
@Slf4j
public class DuelContentRepository {

	private static final String CONTENT_PATTERN = "classpath*:content/duel/*.json";

	private final Map<String, List<DuelQuestion>> questionsByArea = new LinkedHashMap<>();
	private final Map<String, List<DuelQuestion>> questionsByStory = new LinkedHashMap<>();
	private final Map<String, DuelQuestion> questionsById = new LinkedHashMap<>();

	public DuelContentRepository(JsonMapper json, LessonContentRepository lessons, StoryRepository stories) throws IOException {
		DuelContentParser parser = new DuelContentParser(lessonId -> lessons.findById(lessonId).map(LessonContentItem::story));
		for (Resource file : new PathMatchingResourcePatternResolver().getResources(CONTENT_PATTERN)) {
			if (!file.isReadable()) {
				continue;
			}
			JsonNode root = read(json, file);
			List<DuelQuestion> questions = parser.parse(file.getFilename(), root);
			if (!questions.isEmpty()) {
				String storyId = root.path("story").asString(questions.getFirst().category());
				Story story = stories.findById(storyId).orElse(null);
				String areaSlug = story != null ? story.areaSlug() : storyId;

				for (DuelQuestion q : questions) {
					DuelQuestion mapped = q.withCategory(areaSlug);
					questionsById.put(mapped.id(), mapped);
					questionsByStory.computeIfAbsent(storyId, k -> new ArrayList<>()).add(mapped);
					questionsByArea.computeIfAbsent(areaSlug, k -> new ArrayList<>()).add(mapped);
				}
			}
		}
		if (questionsByArea.isEmpty()) {
			log.info("No duel content files found in content/duel/*.json");
		}
	}

	public boolean hasDuelContent(String key) {
		return questionsByArea.containsKey(key) || questionsByStory.containsKey(key);
	}

	public Set<String> storiesWithDuelContent() {
		return Collections.unmodifiableSet(questionsByArea.keySet());
	}

	public Set<String> areasWithDuelContent() {
		return Collections.unmodifiableSet(questionsByArea.keySet());
	}

	public Map<String, List<DuelQuestion>> findAllByStory() {
		return Collections.unmodifiableMap(questionsByArea);
	}

	public List<DuelQuestion> findByArea(String areaSlug) {
		return questionsByArea.getOrDefault(areaSlug, List.of());
	}

	/** Questions of an area (or story) in file order; empty if the category has no duel content. */
	public List<DuelQuestion> findByStory(String key) {
		if (questionsByArea.containsKey(key)) {
			return questionsByArea.get(key);
		}
		return questionsByStory.getOrDefault(key, List.of());
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
