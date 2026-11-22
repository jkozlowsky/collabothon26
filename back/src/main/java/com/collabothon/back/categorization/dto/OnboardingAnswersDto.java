package com.collabothon.back.categorization.dto;

import java.util.List;

public record OnboardingAnswersDto(
		String lifeStage,
		List<String> interests,
		String experience,
		boolean skipped
) {}
