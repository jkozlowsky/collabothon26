package com.collabothon.back.categorization.dto;

import java.util.List;

import com.collabothon.back.categorization.enums.CheckCategory;
import com.collabothon.back.categorization.enums.FocusArea;

// No criterion: the judge's rubric stays in the backend (OWASP LLM01).
public record CheckQuestionDto(
		String id,
		CheckCategory category,
		FocusArea area,
		Long lessonId,
		String accountPrompt,
		List<String> slots,
		String genericPrompt
) {}
