package com.collabothon.back.categorization.dto;

import java.util.List;

public record SharedWithModelDto(
		FactsDto facts,
		OnboardingAnswersDto answers,
		List<SharedCheckDto> checks
) {

	public SharedWithModelDto {
		checks = checks == null ? List.of() : checks;
	}

}
