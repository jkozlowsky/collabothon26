package com.collabothon.back.categorization.repositories.projections;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.QuestionLevel;

public record CheckQuestionProjection(
		String id,
		String lessonId,
		FocusArea area,
		QuestionLevel level,
		String accountPrompt,
		List<String> slots,
		String genericPrompt,
		List<String> options,
		int correctIndex,
		List<String> misconceptions,
		String checks
) {}
