package com.collabothon.back.categorization.consts;

import java.util.Map;

// Observations only, never a recommendation verb (MiFID II).
public final class ExplanationConsts {

	public static final String NEUTRAL_LINE = "It fits the answers you gave.";

	public static final String SAVES_LINE = "Money goes to savings or investments every month.";

	public static final String NO_SAVES_LINE = "No regular transfers to savings or investments.";

	public static final String HOLDS_LINE = "Your accounts with us include investment products.";

	public static final String NO_HOLDS_LINE = "No investment products in your accounts with us.";

	public static final String OVERSPENT_LINE = "You spent more than you earned this month.";

	public static final String OVERDRAFT_LINE = "Your current account is below zero.";

	public static final String LOAN_LINE = "You are paying off a loan with us.";

	public static final String RETIREMENT_LINE = "You said retirement is close or already here.";

	public static final Map<String, String> BUFFER_WORDS = Map.of(
			FactsConsts.BUFFER_UNDER_1, "less than a month",
			FactsConsts.BUFFER_1_3, "1 to 3 months",
			FactsConsts.BUFFER_3_6, "3 to 6 months",
			FactsConsts.BUFFER_6_PLUS, "more than 6 months");

}
