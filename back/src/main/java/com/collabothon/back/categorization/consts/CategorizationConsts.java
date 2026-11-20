package com.collabothon.back.categorization.consts;

import java.time.Duration;

public final class CategorizationConsts {

	/** A repeated POST with the same answers, consent and facts inside this window reuses the Jev result. */
	public static final Duration RECATEGORIZE_AFTER = Duration.ofMinutes(5);

	private CategorizationConsts() {
	}

}
