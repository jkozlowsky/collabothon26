package com.collabothon.back.categorization.dto;

// Serialised verbatim to Jev, so a new component here is sent out too (pinned by a test).
public record JevOnboardingAnswersDto(
		String lifeStage,
		String experience,
		boolean skipped
) {}
