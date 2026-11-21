package com.collabothon.back.categorization.dto;

/** What reached Jev in the step calls or the final call: categories and counts, never the answers themselves. */
public record SharedWithModelDto(
		FactsDto facts,
		OnboardingAnswersDto answers,
		ProfileRangesDto profile,
		int answerCount,
		int stepCallsMade
) {}
