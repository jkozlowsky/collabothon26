package com.collabothon.back.categorization.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public record CategorizationRequestDto(
		@NotNull
		Boolean consent,
		@Valid
		FactsDto facts,
		// Each answer is validated by CheckQuestionService, so a deployment that cannot call Jev ignores them.
		List<@NotNull CheckAnswerDto> answers
) {

	@AssertTrue(message = "facts are only accepted with consent")
	boolean isFactsOnlyWithConsent() {
		return facts == null || Boolean.TRUE.equals(consent);
	}

}
