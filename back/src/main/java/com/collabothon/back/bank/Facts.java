package com.collabothon.back.bank;

import java.util.List;

// The only customer data allowed to leave the bank: bands and flags, nothing identifying.
// Serialised verbatim to Jev, so a new component here is sent out too (pinned by a test in categorization).
public record Facts(
		String ageBand,
		String incomeBand,
		String cashBufferMonths,
		String savingsRate,
		boolean savesRegularly,
		int overdraftMonths,
		boolean holdsInvestments,
		boolean hasMortgage,
		boolean hasInsurance) {

	public static final int WINDOW_MONTHS = 3;

	public static final String AGE_18_25 = "18-25";

	public static final String AGE_26_34 = "26-34";

	public static final String AGE_35_44 = "35-44";

	public static final String AGE_45_54 = "45-54";

	public static final String AGE_55_64 = "55-64";

	public static final String AGE_65_PLUS = "65+";

	public static final List<String> AGE_BANDS = List.of(AGE_18_25, AGE_26_34, AGE_35_44, AGE_45_54, AGE_55_64,
			AGE_65_PLUS);

	public static final List<String> INCOME_BANDS = List.of("<1k", "1-2k", "2-3.5k", "3.5-5k", "5k+");

	public static final String BUFFER_UNDER_1 = "<1";

	public static final String BUFFER_1_3 = "1-3";

	public static final String BUFFER_3_6 = "3-6";

	public static final String BUFFER_6_PLUS = "6+";

	public static final List<String> CASH_BUFFER_BANDS = List.of(BUFFER_UNDER_1, BUFFER_1_3, BUFFER_3_6,
			BUFFER_6_PLUS);

	public static final String RATE_NEGATIVE = "negative";

	public static final String RATE_0_10 = "0-10%";

	public static final String RATE_10_20 = "10-20%";

	public static final String RATE_20_PLUS = "20%+";

	public static final List<String> SAVINGS_RATE_BANDS = List.of(RATE_NEGATIVE, RATE_0_10, RATE_10_20,
			RATE_20_PLUS);

}
