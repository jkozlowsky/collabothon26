package com.collabothon.back.duel.consts;

public final class DuelConsts {

	public static final int MAX_CATEGORIES = 4;

	public static final int HISTORY_LIMIT = 50;

	public static final int RANKING_LIMIT = 50;

	public static final int XP_PER_CORRECT_ANSWER = 5;

	public static final String DEFAULT_AVATAR = "m1";

	public static final String CONTENT_PATTERN = "classpath*:content/duel/*.json";

	// Changing it reshuffles the sort and match questions of every stored match.
	public static final long SHUFFLE_SEED_MULTIPLIER = 10007L;

	public static final double TOLERANCE_EPSILON = 1e-9;

	public static final long DEFAULT_BASE_MS = 20_000L;

	public static final long MS_PER_SECOND = 1000L;

}
