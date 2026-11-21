package com.collabothon.back.categorization.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
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
) {

	public CategorizationRequestDto {
		history = history == null ? List.of() : history;
		mastery = mastery == null ? Map.of() : mastery;
		useRules = Boolean.TRUE.equals(useRules);
		stepCallsMade = stepCallsMade == null ? 0 : stepCallsMade;
	}

	@AssertTrue(message = "facts are only accepted with consent")
	boolean isFactsOnlyWithConsent() {
		return facts == null || Boolean.TRUE.equals(consent);
	}

	@AssertTrue(message = "savings cover is only asked without consent")
	boolean isSavingsCoverOnlyWithoutConsent() {
		return profile == null || profile.savingsCover() == null || !Boolean.TRUE.equals(consent);
	}

}
