package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import com.collabothon.back.categorization.consts.FactsConsts;

// Computed on the device from the bank (front/src/lib/categorization.ts): bands and flags, nothing identifying.
// Serialised verbatim to Jev, so a new component here is sent out too (pinned by a test).
public record FactsDto(
		@NotNull @Pattern(regexp = FactsConsts.INCOME_BANDS) String incomeBand,
		@NotNull @Pattern(regexp = FactsConsts.CASH_BUFFER_BANDS) String cashBufferMonths,
		@NotNull @Pattern(regexp = FactsConsts.SAVINGS_RATES) String savingsRate,
		@NotNull Boolean savesRegularly,
		@NotNull Boolean inOverdraft,
		@NotNull Boolean holdsInvestments,
		@NotNull Boolean hasLoan) {
}
