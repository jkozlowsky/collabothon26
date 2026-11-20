package com.collabothon.back.categorization.dto;

import java.util.List;

// Serialised verbatim to Jev, so a new component here is sent out too (pinned by a test).
public record OnboardingAnswersDto(
		String lifeStage,
		List<String> goals,
		String experience,
		boolean skipped
) {}
