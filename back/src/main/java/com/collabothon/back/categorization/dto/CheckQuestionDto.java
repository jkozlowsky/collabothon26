package com.collabothon.back.categorization.dto;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;

// The correct option and the explanation go out so the app can show them after each answer.
public record CheckQuestionDto(
		String id,
		String lessonId,
		FocusArea area,
		String prompt,
		List<String> options,
		int correctIndex,
		String explanation
) {}
