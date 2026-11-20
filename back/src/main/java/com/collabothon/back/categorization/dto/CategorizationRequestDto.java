package com.collabothon.back.categorization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public record CategorizationRequestDto(
		@NotNull
		Boolean consent,
		@Valid
		FactsDto facts
) {

	@AssertTrue(message = "facts are only accepted with consent")
	boolean isFactsOnlyWithConsent() {
		return facts == null || Boolean.TRUE.equals(consent);
	}

}
