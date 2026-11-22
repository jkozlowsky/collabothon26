package com.collabothon.back.xp.consts;

public final class XpConsts {

	public static final int MIN_LEVEL = 1;
	public static final int MAX_LEVEL = 500;

	// Going from level n to n + 1 costs round(BASE + FACTOR * n^EXPONENT).
	public static final double LEVEL_COST_BASE = 20.0;
	public static final double LEVEL_COST_FACTOR = 2.0;
	public static final double LEVEL_COST_EXPONENT = 1.15;

}
