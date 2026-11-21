package com.collabothon.back.categorization.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.collabothon.back.categorization.consts.CategorizationConsts;

public record CategorizationRequestDto(
		@NotNull
		Boolean consent,
		@Valid
		FactsDto facts,
		// The answers themselves are validated by CheckQuestionService, so a deployment without a judge ignores them.
		@Size(max = CategorizationConsts.MAX_ANSWERS)
		List<CheckAnswerDto> answers
) {

	@AssertTrue(message = "facts are only accepted with consent")
	boolean isFactsOnlyWithConsent() {
		return facts == null || Boolean.TRUE.equals(consent);
	}

}
