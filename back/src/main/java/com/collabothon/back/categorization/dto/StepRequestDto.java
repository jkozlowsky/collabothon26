package com.collabothon.back.categorization.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.collabothon.back.categorization.consts.CategorizationConsts;

public record StepRequestDto(
		@NotNull
		Boolean consent,
		@Valid
		FactsDto facts,
		@Valid
		ProfileRangesDto profile,
		@NotNull
		@Size(max = CategorizationConsts.MAX_QUESTIONS)
		List<@NotNull @Valid HistoryEntryDto> history,
		boolean useRules
) {

	@AssertTrue(message = "facts are only accepted with consent")
	boolean isFactsOnlyWithConsent() {
		return facts == null || Boolean.TRUE.equals(consent);
	}

	@AssertTrue(message = "savings cover is only asked without consent")
	boolean isSavingsCoverOnlyWithoutConsent() {
		return profile == null || profile.savingsCover() == null || !Boolean.TRUE.equals(consent);
	}

}
