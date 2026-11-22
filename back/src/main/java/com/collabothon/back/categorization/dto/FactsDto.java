package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import com.collabothon.back.categorization.consts.FactsConsts;

// Serialised verbatim to Jev: a new component is sent out too, so keep it to bands and flags (pinned by a test).
public record FactsDto(
		@NotNull
		@Pattern(regexp = FactsConsts.INCOME_BANDS)
		String incomeBand,
		@NotNull
		@Pattern(regexp = FactsConsts.CASH_BUFFER_BANDS)
		String cashBufferMonths,
		@NotNull
		@Pattern(regexp = FactsConsts.SAVINGS_RATES)
		String savingsRate,
		@NotNull
		Boolean savesRegularly,
		@NotNull
		Boolean inOverdraft,
		@NotNull
		Boolean holdsInvestments,
		@NotNull
		Boolean hasLoan
) {}
