package com.collabothon.back.categorization.dto;

import java.util.Map;

import lombok.Builder;
import lombok.With;

@Builder
public record StepResponseDto(
		Map<String, Double> mastery,
		String nextQuestionId,
		boolean done,
		@With
		boolean useRules,
		@With
		boolean stepFellBack
) {}
