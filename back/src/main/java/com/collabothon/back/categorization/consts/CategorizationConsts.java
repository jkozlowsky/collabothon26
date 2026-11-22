package com.collabothon.back.categorization.consts;

import java.time.Duration;

public final class CategorizationConsts {

	public static final Duration RECATEGORIZE_AFTER = Duration.ofMinutes(5);

	public static final double FOCUS_THRESHOLD = 0.5;

	public static final int MAX_QUESTION_ID_LENGTH = 64;

	public static final String AGE_18_25 = "18-25";

	public static final String AGE_60_PLUS = "60+";

	public static final String AGE_BANDS = "18-25|26-40|41-59|60\\+";

	public static final String HORIZON_WITHIN_1Y = "within-1y";

	public static final String HORIZONS = "within-1y|1-5y|5y\\+|not-sure";

	// A lesson counts its own quiz steps in the prompt, which means nothing in the test.
	public static final String CHECKPOINT_PREFIX_PATTERN = "^Checkpoint \\d+ of \\d+ · ";

	public static final String LABEL_SEPARATOR = "_";

	public static final String NOT_IN_LABEL_PATTERN = "[^a-z0-9]+";

	public static final String LABEL_EDGE_PATTERN = "^_|_$";

	public static final double RULE_START = 0.5;

	public static final double SCORE_CORRECT = 0.85;

	public static final double SCORE_WRONG = 0.25;

	public static final int MIN_QUESTIONS = 3;

	public static final int MAX_QUESTIONS = 6;

	public static final int RULE_MAX_QUESTIONS = 4;

	public static final double ENOUGH_THRESHOLD = 0.7;

	public static final double JUST_STARTING_BELOW = 0.4;

	public static final double SOLID_ABOVE = 0.75;

	public static final int SOLID_MIN_ANSWERS = 2;

	public static final int MAX_GAP_CARDS = 2;

	public static final int LESSON_CHOICES_PER_AREA = 2;

}
