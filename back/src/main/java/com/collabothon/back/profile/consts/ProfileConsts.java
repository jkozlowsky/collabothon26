package com.collabothon.back.profile.consts;

import java.time.Duration;
import java.util.List;

import com.collabothon.back.common.consts.DemoConsts;

public final class ProfileConsts {

	public static final int MAX_DEVICE_ID_LENGTH = 64;

	public static final int MAX_INTERESTS = 32;

	public static final String AVATAR_PATTERN = "[mf][1-3]";
	public static final String LIFE_STAGE_STARTING_OUT = "starting-out";
	public static final String LIFE_STAGE_BUILDING = "building";
	public static final String LIFE_STAGE_SETTLED = "settled";
	public static final String LIFE_STAGE_LATER_LIFE = "later-life";
	public static final String LIFE_STAGE_PATTERN = LIFE_STAGE_STARTING_OUT + "|" + LIFE_STAGE_BUILDING + "|"
			+ LIFE_STAGE_SETTLED + "|" + LIFE_STAGE_LATER_LIFE;
	public static final String EXPERIENCE_NOT_SAVING = "not-saving";
	public static final String EXPERIENCE_OCCASIONAL = "occasional";
	public static final String EXPERIENCE_REGULAR = "regular";
	public static final String EXPERIENCE_INVESTING = "investing";
	public static final String EXPERIENCE_PLANNING = "planning";
	public static final String EXPERIENCE_PATTERN = EXPERIENCE_NOT_SAVING + "|" + EXPERIENCE_OCCASIONAL + "|"
			+ EXPERIENCE_REGULAR + "|" + EXPERIENCE_INVESTING + "|" + EXPERIENCE_PLANNING;

	public static final String LESSON_MODE_CLASSIC = "classic";
	public static final String LESSON_MODE_VIDEO = "video";
	public static final String LESSON_MODE_PATTERN = LESSON_MODE_CLASSIC + "|" + LESSON_MODE_VIDEO;

	public static final Duration SESSION_TTL = Duration.ofSeconds(120);
	public static final Duration HEARTBEAT_INTERVAL = Duration.ofSeconds(30);

	// Demo hack: only these accounts can be claimed by a device, and they are listed in this order.
	public static final List<String> LOCKABLE_ACCOUNT_IDS = List.of(DemoConsts.ALEX_USER_ID,
			DemoConsts.DANIEL_USER_ID, DemoConsts.ELENA_USER_ID);

}
