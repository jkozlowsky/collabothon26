package com.collabothon.back.lesson.services;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.converters.lesson.LessonSummaryMapper;
import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Where a user stands in a story's lesson path: a lesson is done, available (the first not done after the done ones)
 * or locked. Runs in the calling service's transaction.
 */
@Component
@RequiredArgsConstructor
class LessonProgression {

	static final String DONE = "done";

	static final String AVAILABLE = "available";

	static final String LOCKED = "locked";

	private final LessonContentRepository lessons;

	private final StoryRepository stories;

	private final LessonCompletionRepository completions;

	private final LessonSummaryMapper summaryMapper;

	ObjectNode lessonOrNotFound(String lessonId) {
		return lessons.findNodeById(lessonId)
			.orElseThrow(() -> new BusinessException(LessonErrorCode.LESSON_NOT_FOUND, lessonId));
	}

	Set<String> completedLessonIds(String userId) {
		if (userId == null || userId.isBlank()) {
			return Set.of();
		}
		return new HashSet<>(completions.findLessonIdsByUserId(userId));
	}

	/** Lesson ids of the lesson's story, in path order. */
	List<String> storyLessonIds(JsonNode lesson) {
		String storyId = lesson.path("story").asString();
		return lessons.lessonIdsOf(stories.findRawById(storyId).orElseThrow());
	}

	/** The next lesson in the same story, or null for the last one. */
	String nextLessonId(JsonNode lesson) {
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(lesson.path("id").asString());
		if (index + 1 < ids.size()) {
			return ids.get(index + 1);
		}
		return null;
	}

	/** Fails unless the previous lesson of the story is done. Anonymous users (no id) may open any lesson. */
	void requireUnlocked(JsonNode lesson, String userId) {
		if (userId == null) {
			return;
		}
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(lesson.path("id").asString());
		if (index > 0 && !completedLessonIds(userId).contains(ids.get(index - 1))) {
			throw new BusinessException(LessonErrorCode.PREVIOUS_LESSON_LOCKED);
		}
	}

	List<LessonSummary> summaries(JsonNode story, Set<String> done) {
		List<LessonSummary> out = new ArrayList<>();
		boolean previousDone = true;
		for (String lessonId : lessons.lessonIdsOf(story)) {
			LessonContentItem lesson = lessons.findById(lessonId).orElseThrow();
			boolean isDone = done.contains(lessonId);
			out.add(summaryMapper.toSummary(lesson, status(isDone, previousDone)));
			previousDone = isDone;
		}
		return out;
	}

	private static String status(boolean done, boolean previousDone) {
		if (done) {
			return DONE;
		}
		if (previousDone) {
			return AVAILABLE;
		}
		return LOCKED;
	}

}
