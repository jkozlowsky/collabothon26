package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.Pattern;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.consts.FactsConsts;

// Ranges the user picked in the Quick check; serialised verbatim to Jev, so a new component is sent out too.
public record ProfileRangesDto(
		@Pattern(regexp = CategorizationConsts.AGE_BANDS)
		String ageBand,
		@Pattern(regexp = FactsConsts.CASH_BUFFER_BANDS)
		String savingsCover,
		@Pattern(regexp = CategorizationConsts.HORIZONS)
		String horizon
) {}
