package com.collabothon.back.lesson.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.Story;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Repository
public class StoryRepository {

	private final List<Story> stories;

	public StoryRepository(JsonMapper json) throws IOException {
		try (InputStream in = new ClassPathResource(LessonConsts.STORIES_FILE).getInputStream()) {
			this.stories = json.readTree(in).valueStream().map(StoryRepository::toStory).toList();
		}
	}

	public List<Story> findAll() {
		return stories;
	}

	public Optional<Story> findById(String id) {
		return stories.stream().filter(story -> story.id().equals(id)).findFirst();
	}

	public List<String> canonicalAreaSlugs() {
		return LessonConsts.CANONICAL_AREA_SLUGS;
	}

	public List<Story> findByAreaSlug(String areaSlug) {
		return stories.stream().filter(story -> story.areaSlug().equals(areaSlug)).toList();
	}

	private static Story toStory(JsonNode story) {
		return new Story(
				story.path("id").asString(""),
				story.path("area").asString(""),
				story.path("category").asString(""),
				story.path("city").asString(""),
				story.path("topic").asString(""),
				story.path("status").asString(""),
				story.path("icon").asString(""),
				story.path("color").asString(""),
				story.path("lessonIds").valueStream().map(id -> id.asString("")).toList(),
				duelFallback(story),
				story);
	}

	private static String duelFallback(JsonNode story) {
		if (!story.hasNonNull("duelFallback")) {
			return null;
		}
		return story.path("duelFallback").asString(null);
	}

}
