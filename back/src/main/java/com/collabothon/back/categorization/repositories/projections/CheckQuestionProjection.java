package com.collabothon.back.categorization.repositories.projections;

import java.util.List;

import com.collabothon.back.categorization.enums.CheckCategory;
import com.collabothon.back.categorization.enums.FocusArea;

public record CheckQuestionProjection(
		String id,
		CheckCategory category,
		FocusArea area,
		Long lessonId,
		String lessonTitle,
		String accountPrompt,
		List<String> slots,
		String genericPrompt,
		String criterion
) {}
