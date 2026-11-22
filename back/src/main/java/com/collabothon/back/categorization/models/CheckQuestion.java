package com.collabothon.back.categorization.models;

import java.util.List;

import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.FocusArea;

// The area is the story's, the topic and concepts are the lesson's.
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

	// No option is "Not sure".
	public AnswerResult resultOf(Integer optionIndex) {
		if (optionIndex == null) {
			return AnswerResult.NOT_SURE;
		}
		if (optionIndex == correctIndex) {
			return AnswerResult.CORRECT;
		}
		return AnswerResult.WRONG;
	}

	public CheckLesson lesson() {
		return new CheckLesson(lessonId, storyId, area, topic, concepts);
	}

}
