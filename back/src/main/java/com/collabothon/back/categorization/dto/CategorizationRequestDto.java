package com.collabothon.back.categorization.dto;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.collabothon.back.categorization.consts.CategorizationConsts;

public record CategorizationRequestDto(
		@NotNull
		Boolean consent,
		@Valid
		FactsDto facts,
		@Valid
		ProfileRangesDto profile,
		@Size(max = CategorizationConsts.MAX_QUESTIONS)
		List<@NotNull @Valid HistoryEntryDto> history,
		Map<String, @DecimalMin("0") @DecimalMax("1") Double> mastery,
		Boolean useRules,
		@PositiveOrZero
		Integer stepCallsMade
) implements ConsentedRequest {

	public CategorizationRequestDto {
		history = Objects.requireNonNullElse(history, List.of());
		mastery = Objects.requireNonNullElse(mastery, Map.of());
		useRules = Boolean.TRUE.equals(useRules);
		stepCallsMade = Objects.requireNonNullElse(stepCallsMade, 0);
	}

}
