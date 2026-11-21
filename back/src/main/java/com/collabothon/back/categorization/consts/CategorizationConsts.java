package com.collabothon.back.categorization.consts;

import java.time.Duration;

public final class CategorizationConsts {

	/** {@code user_profile.user_id} is VARCHAR(64). */
	public static final int MAX_USER_ID_LENGTH = 64;

	/** A repeated POST with the same answers, consent and facts inside this window reuses the Jev result. */
	public static final Duration RECATEGORIZE_AFTER = Duration.ofMinutes(5);

	public static final double FOCUS_THRESHOLD = 0.5;

	/** The Quick check draws this many areas, and so this many questions, from each category. */
	public static final int CHECKS_PER_CATEGORY = 2;

}
