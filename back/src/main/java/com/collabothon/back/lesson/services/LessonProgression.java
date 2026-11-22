package com.collabothon.back.lesson.services;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.converters.lesson.LessonSummaryMapper;
import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.LessonContentItem;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.RequiredArgsConstructor;

// Runs in the calling service's transaction.
@Component
@RequiredArgsConstructor
class LessonProgression {

	private final LessonContentRepository lessons;

	private final StoryRepository stories;

	private final LessonCompletionRepository completions;

	private final LessonSummaryMapper summaryMapper;

	LessonContentItem lessonOrNotFound(String lessonId) {
		return lessons.findById(lessonId)
			.orElseThrow(() -> new BusinessException(LessonErrorCode.LESSON_NOT_FOUND, lessonId));
	}

	Set<String> completedLessonIds(String userId) {
		if (userId == null || userId.isBlank()) {
			return Set.of();
		}
		return new HashSet<>(completions.findLessonIdsByUserId(userId));
	}

	List<String> storyLessonIds(LessonContentItem lesson) {
		return stories.findById(lesson.story()).orElseThrow().lessonIds();
	}

	// Null for the story's last lesson, as the API shows it.
	String nextLessonId(LessonContentItem lesson) {
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(lesson.id());
		if (index + 1 < ids.size()) {
			return ids.get(index + 1);
		}
		return null;
	}

	// Anonymous users (no id at all) may open any lesson.
	void requireUnlocked(LessonContentItem lesson, String userId) {
		if (userId == null) {
			return;
		}
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(lesson.id());
		if (index > 0 && !completedLessonIds(userId).contains(ids.get(index - 1))) {
			throw new BusinessException(LessonErrorCode.PREVIOUS_LESSON_LOCKED);
		}
	}

	List<LessonSummary> summaries(Story story, Set<String> done) {
		List<LessonSummary> summaries = new ArrayList<>();
		boolean previousDone = true;
		for (String lessonId : story.lessonIds()) {
			LessonContentItem lesson = lessons.findById(lessonId).orElseThrow();
			boolean isDone = done.contains(lessonId);
			summaries.add(summaryMapper.toSummary(lesson, status(isDone, previousDone)));
			previousDone = isDone;
		}
		return summaries;
	}

	private static String status(boolean done, boolean previousDone) {
		if (done) {
			return LessonConsts.STATUS_DONE;
		}
		if (previousDone) {
			return LessonConsts.STATUS_AVAILABLE;
		}
		return LessonConsts.STATUS_LOCKED;
	}

}
