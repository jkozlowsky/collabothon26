package com.collabothon.back.categorization;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

// Computed on the device from the bank (front/src/lib/categorization.ts): bands and flags, nothing identifying.
// Serialised verbatim to Jev, so a new component here is sent out too (pinned by a test).
public record Facts(
		@NotNull @Pattern(regexp = Facts.INCOME_BANDS) String incomeBand,
		@NotNull @Pattern(regexp = Facts.CASH_BUFFER_BANDS) String cashBufferMonths,
		@NotNull @Pattern(regexp = Facts.SAVINGS_RATES) String savingsRate,
		@NotNull Boolean savesRegularly,
		@NotNull Boolean inOverdraft,
		@NotNull Boolean holdsInvestments,
		@NotNull Boolean hasLoan) {

	static final String INCOME_BANDS = "<1k|1-2k|2-3\\.5k|3\\.5-5k|5k\\+";

	static final String BUFFER_UNDER_1 = "<1";

	static final String BUFFER_1_3 = "1-3";

	static final String BUFFER_3_6 = "3-6";

	static final String BUFFER_6_PLUS = "6+";

	static final String CASH_BUFFER_BANDS = "<1|1-3|3-6|6\\+";

	static final String RATE_NEGATIVE = "negative";

	static final String SAVINGS_RATES = "negative|0-10%|10-20%|20%\\+";

}
