package com.collabothon.back.categorization.consts;

import java.util.Set;

public final class JevConsts {

	public static final String DEFAULT_BASE_URL = "https://api.typesafe.ai";

	public static final String DEFAULT_MODEL = "jev-latest";

	public static final String SYSTEM_ONE_PATH = "/v1/systemone";

	public static final String ANSWER_TAG = "answer";

	public static final String CHECK_QUESTION_PREFIX = "check_";

	public static final String API_KEY_PATTERN = "[\\x21-\\x7E]*";

	public static final String MODEL_ID_PATTERN = "[A-Za-z0-9._:-]{1,64}";

	/** What {@link java.net.URI#getPort()} returns when the URL has no port. */
	public static final int NO_PORT = -1;

	public static final int MIN_PORT = 1;

	public static final int MAX_PORT = 65_535;

	public static final Set<String> WEB_SCHEMES = Set.of("http", "https");

	public static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

}
