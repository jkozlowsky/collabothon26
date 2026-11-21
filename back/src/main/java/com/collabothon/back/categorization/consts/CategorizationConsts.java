package com.collabothon.back.categorization.consts;

import java.time.Duration;

public final class CategorizationConsts {

	/** {@code user_profile.user_id} is VARCHAR(64). */
	public static final int MAX_USER_ID_LENGTH = 64;

	/** A repeated POST with the same answers, consent and facts inside this window reuses the Jev result. */
	public static final Duration RECATEGORIZE_AFTER = Duration.ofMinutes(5);

	public static final double FOCUS_THRESHOLD = 0.5;

	/** {@code check_question.id} is VARCHAR(64). */
	public static final int MAX_QUESTION_ID_LENGTH = 64;

	public static final String AGE_18_25 = "18-25";

	public static final String AGE_60_PLUS = "60+";

	public static final String AGE_BANDS = "18-25|26-40|41-59|60\\+";

	public static final String HORIZON_WITHIN_1Y = "within-1y";

	public static final String HORIZONS = "within-1y|1-5y|5y\\+|not-sure";

	public static final double RULE_START = 0.5;

	public static final double SCORE_CORRECT_SURE = 0.85;

	public static final double SCORE_CORRECT_FAIRLY_SURE = 0.75;

	public static final double SCORE_CORRECT_GUESSING = 0.6;

	public static final double SCORE_WRONG = 0.25;

	public static final int MIN_QUESTIONS = 3;

	public static final int MAX_QUESTIONS = 6;

	public static final int RULE_MAX_QUESTIONS = 4;

	public static final double ENOUGH_THRESHOLD = 0.7;

	public static final double JUST_STARTING_BELOW = 0.4;

	public static final double SOLID_ABOVE = 0.75;

	public static final int SOLID_MIN_ANSWERS = 2;

	public static final int MAX_GAP_CARDS = 2;

	/** Served for saving with money needed within a year (D8). */
	public static final String SHORT_HORIZON_QUESTION_ID = "fall-before-you-need-it";

	/** Twenty years of compounding: never served with money needed within a year (D8). */
	public static final String LONG_HORIZON_QUESTION_ID = "short-term-fall";

	public static final double CHIP_GUESSING = 0.25;

	public static final double CHIP_FAIRLY_SURE = 0.6;

	public static final double CHIP_SURE = 0.9;

}
