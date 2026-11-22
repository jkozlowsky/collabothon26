package com.collabothon.back.categorization.dto;

import java.util.List;

// What the app is told was shared with Jev; JevClient sends only the components that have a value.
public record OnboardingAnswersDto(
		String lifeStage,
		List<String> goals,
		String experience,
		boolean skipped
) {}
