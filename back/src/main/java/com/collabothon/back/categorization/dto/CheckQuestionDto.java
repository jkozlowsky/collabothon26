package com.collabothon.back.categorization.dto;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;

// No correct option, misconceptions, checks sentence or level: the answer key stays in the backend.
public record CheckQuestionDto(
		String id,
		FocusArea area,
		String accountPrompt,
		List<String> slots,
		String genericPrompt,
		List<String> options
) {}
