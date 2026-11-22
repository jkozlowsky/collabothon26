package com.collabothon.back.lesson.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import com.collabothon.back.dto.lesson.VideoSummary;
import com.collabothon.back.glossary.repositories.GlossaryContentRepository;
import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.LessonContentItem;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.validation.LessonRules;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Repository
public class LessonContentRepository {

	private final Map<String, LessonContentItem> lessons;

	public LessonContentRepository(JsonMapper json, GlossaryContentRepository glossary, StoryRepository stories)
			throws IOException {
		this.lessons = load(json, glossary.concepts());
		requireEveryLessonListedOnce(stories.findAll(), lessons);
	}

	public Optional<LessonContentItem> findById(String lessonId) {
		return Optional.ofNullable(lessons.get(lessonId));
	}

	private static Map<String, LessonContentItem> load(JsonMapper json, Set<String> concepts) throws IOException {
		PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
		Predicate<String> audioExists = audio -> resolver.getResource(LessonConsts.AUDIO_FILES + audio).exists();
		Map<String, LessonContentItem> loaded = new LinkedHashMap<>();
		for (Resource file : resolver.getResources(LessonConsts.LESSON_FILES)) {
			ObjectNode lesson = read(json, file);
			LessonRules.validate(lesson, concepts, audioExists);
			String id = lesson.path("id").asString();
			requireFileNamedById(file, id);
			if (loaded.put(id, toItem(id, lesson)) != null) {
				throw new IllegalStateException("Duplicate lesson id " + id);
			}
		}
		return Collections.unmodifiableMap(loaded);
	}

	private static ObjectNode read(JsonMapper json, Resource file) throws IOException {
		try (InputStream in = file.getInputStream()) {
			return (ObjectNode) json.readTree(in);
		}
	}

	private static void requireFileNamedById(Resource file, String id) {
		String expected = id + LessonConsts.LESSON_FILE_SUFFIX;
		if (!expected.equals(file.getFilename())) {
			throw new IllegalStateException("Lesson file " + file.getFilename() + " must hold lesson id " + id);
		}
	}

	private static LessonContentItem toItem(String id, ObjectNode lesson) {
		return new LessonContentItem(
				id,
				lesson.path("story").asString(""),
				lesson.path("title").asString(""),
				lesson.path("place").asString(""),
				lesson.path("topic").asString(null),
				lesson.path("minutes").asInt(0),
				lesson.path("xp").asInt(0),
				videoSummary(lesson),
				lesson);
	}

	private static VideoSummary videoSummary(ObjectNode lesson) {
		if (!lesson.hasNonNull("video")) {
			return null;
		}
		return new VideoSummary(lesson.path("video").path("minutes").asInt());
	}

	private static void requireEveryLessonListedOnce(List<Story> stories, Map<String, LessonContentItem> lessons) {
		Set<String> listed = new HashSet<>();
		for (Story story : stories) {
			for (String lessonId : story.lessonIds()) {
				requireLessonOfStory(story, lessonId, lessons);
				if (!listed.add(lessonId)) {
					throw new IllegalStateException("Lesson " + lessonId + " listed twice");
				}
			}
		}
		if (!listed.equals(lessons.keySet())) {
			throw new IllegalStateException("Every lesson must be listed in exactly one story in stories.json");
		}
	}

	private static void requireLessonOfStory(Story story, String lessonId, Map<String, LessonContentItem> lessons) {
		LessonContentItem lesson = lessons.get(lessonId);
		if (lesson == null) {
			throw new IllegalStateException("Story " + story.id() + " lists lesson " + lessonId + " that is missing");
		}
		if (!story.id().equals(lesson.story())) {
			throw new IllegalStateException(
					"Story " + story.id() + " lists lesson " + lessonId + " belonging to another story");
		}
	}

}
