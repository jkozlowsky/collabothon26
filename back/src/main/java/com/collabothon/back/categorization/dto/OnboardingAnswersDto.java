package com.collabothon.back.categorization.dto;

import java.util.List;

// What the app is told was shared with Jev; JevRequests sends only the values given, never the interest ids.
public record OnboardingAnswersDto(
		String lifeStage,
		List<String> interests,
		String experience,
		boolean skipped
) {}
