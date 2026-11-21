package com.collabothon.back.categorization.dto;

import java.util.List;

/** What reached Jev in the step calls or the final call: categories and counts, never the answers themselves. */
public record SharedWithModelDto(
		FactsDto facts,
		OnboardingAnswersDto answers,
		List<String> goals,
		ProfileRangesDto profile,
		int answerCount,
		int stepCallsMade
) {}
