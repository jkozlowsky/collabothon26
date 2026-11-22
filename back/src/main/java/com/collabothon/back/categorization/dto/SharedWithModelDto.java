package com.collabothon.back.categorization.dto;

import java.util.List;

// The disclosure of what reached Jev: categories and counts, never the knowledge answers themselves.
public record SharedWithModelDto(
		FactsDto facts,
		OnboardingAnswersDto answers,
		List<String> interests,
		ProfileRangesDto profile,
		int answerCount,
		int stepCallsMade
) {}
