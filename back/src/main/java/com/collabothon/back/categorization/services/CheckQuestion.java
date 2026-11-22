package com.collabothon.back.categorization.services;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;

/**
 * One quiz step of a lesson, asked by the Quick check; {@code id} is {@code <lessonId>/<stepId>}. The area is the
 * story's, the topic and concepts are the lesson's.
 */
public record CheckQuestion(
		String id,
		String lessonId,
		String storyId,
		FocusArea area,
		String topic,
		List<String> concepts,
		String prompt,
		List<String> options,
		int correctIndex,
		String explanation
) {

	public CheckLesson lesson() {
		return new CheckLesson(lessonId, storyId, area, topic, concepts);
	}

}
