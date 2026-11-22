package com.collabothon.back.categorization.consts;

import java.time.Duration;
import java.util.Set;
import java.util.regex.Pattern;

public final class JevConsts {

	public static final String DEFAULT_BASE_URL = "https://api.typesafe.ai";

	// Pinned: the jev-latest alias can move to a model the questions were not written for.
	public static final String DEFAULT_MODEL = "jev-1.14.0";

	public static final String SYSTEM_ONE_PATH = "/v1/systemone";

	public static final String BEARER_PREFIX = "Bearer ";

	// Only for a step call; the final call keeps the shared 7 s read timeout.
	public static final Duration STEP_READ_TIMEOUT = Duration.ofSeconds(3);

	public static final Duration STEP_BUDGET = Duration.ofMillis(1500);

	public static final Pattern API_KEY_PATTERN = Pattern.compile("[\\x21-\\x7E]*");

	public static final String REDACTED_KEY = "<redacted>";

	public static final String MODEL_ID_PATTERN = "[A-Za-z0-9._:-]{1,64}";

	// What URI.getPort() returns when the URL has no port.
	public static final int NO_PORT = -1;

	public static final int MIN_PORT = 1;

	public static final int MAX_PORT = 65_535;

	public static final String HTTPS = "https";

	public static final Set<String> WEB_SCHEMES = Set.of("http", HTTPS);

	public static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

	public static final int MIN_CHOICE_LABELS = 2;

	public static final double MIN_PROBABILITY = 0;

	public static final double MAX_PROBABILITY = 1;

	public static final double ENOUGH_NOT_ASKED = 0;

}
