package com.collabothon.back.categorization.dto;

import java.util.Map;

/** {@code mastery} has every bank area, null until it has an answer; {@code done} comes with no next question. */
public record StepResponseDto(
		Map<String, Double> mastery,
		String nextQuestionId,
		boolean done,
		boolean useRules
) {}
