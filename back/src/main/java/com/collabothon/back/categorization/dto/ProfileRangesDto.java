package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.Pattern;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.consts.FactsConsts;

// JevRequests names the ranges it sends, so a new component goes there too.
public record ProfileRangesDto(
		@Pattern(regexp = CategorizationConsts.AGE_BANDS)
		String ageBand,
		@Pattern(regexp = FactsConsts.CASH_BUFFER_BANDS)
		String savingsCover,
		@Pattern(regexp = CategorizationConsts.HORIZONS)
		String horizon
) {}
