package com.collabothon.back.duel.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.lesson.models.LessonContentItem;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Duel questions by area, validated at startup so broken content cannot break a duel mid-demo. */
@Repository
@Slf4j
public class DuelContentRepository {

	private final Map<String, List<DuelQuestion>> questionsByArea = new HashMap<>();

	private final Map<String, DuelQuestion> questionsById = new HashMap<>();

	public DuelContentRepository(JsonMapper json, LessonContentRepository lessons, StoryRepository stories)
			throws IOException {
		DuelContentParser parser = new DuelContentParser(
				lessonId -> lessons.findById(lessonId).map(LessonContentItem::story));
		for (Resource file : new PathMatchingResourcePatternResolver().getResources(DuelConsts.CONTENT_PATTERN)) {
			if (!file.isReadable()) {
				continue;
			}
			for (DuelQuestion question : parser.parse(file.getFilename(), read(json, file))) {
				add(question.withCategory(areaOf(question.category(), stories)));
			}
		}
		if (questionsByArea.isEmpty()) {
			log.info("No duel content files found in content/duel/*.json");
		}
	}

	public boolean hasDuelContent(String areaSlug) {
		return questionsByArea.containsKey(areaSlug);
	}

	/** The area's questions in file order, which the seeded draws depend on. */
	public List<DuelQuestion> findByArea(String areaSlug) {
		return questionsByArea.getOrDefault(areaSlug, List.of());
	}

	public Optional<DuelQuestion> findById(String id) {
		return Optional.ofNullable(questionsById.get(id));
	}

	private void add(DuelQuestion question) {
		questionsById.put(question.id(), question);
		questionsByArea.computeIfAbsent(question.category(), area -> new ArrayList<>()).add(question);
	}

	private static String areaOf(String storyId, StoryRepository stories) {
		return stories.findById(storyId).map(Story::areaSlug).orElse(storyId);
	}

	private static JsonNode read(JsonMapper json, Resource resource) throws IOException {
		try (InputStream in = resource.getInputStream()) {
			return json.readTree(in);
		}
	}

}
