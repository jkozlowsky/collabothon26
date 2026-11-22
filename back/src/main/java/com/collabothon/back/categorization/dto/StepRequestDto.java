package com.collabothon.back.categorization.dto;

import java.util.List;

import jakarta.validation.Valid;
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
		// Primitive on purpose, unlike the final request: a step without useRules is a 400.
		boolean useRules,
		Boolean stepFellBack
) implements ConsentedRequest {

	public StepRequestDto {
		stepFellBack = Boolean.TRUE.equals(stepFellBack);
	}

}
