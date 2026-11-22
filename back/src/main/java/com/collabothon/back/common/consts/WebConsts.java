package com.collabothon.back.common.consts;

public final class WebConsts {

	public static final String API_PATHS = "/api/**";

	// Spring serves static/audio/ here; a scene's audio path is relative to it.
	public static final String AUDIO_BASE = "/audio/";

	public static final String AUDIO_PATHS = AUDIO_BASE + "**";

}
