package com.collabothon.back.categorization.dto;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;

// The correct option goes out so the app can show it after each answer; misconceptions, the checks sentence and the level stay in the backend.
public record CheckQuestionDto(
		String id,
		FocusArea area,
		String accountPrompt,
		List<String> slots,
		String genericPrompt,
		List<String> options,
		int correctIndex
) {}
