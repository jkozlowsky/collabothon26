package com.collabothon.back.lesson.consts;

import java.util.Set;
import java.util.regex.Pattern;

public final class SceneConsts {

	public static final String SCENE = "scene";

	// Everything graded or hands-on must be in the video order; only chat and text may be left out.
	public static final Set<String> REQUIRED_IN_BEATS = Set.of(LessonConsts.QUIZ, LessonConsts.MATCH, LessonConsts.SORT,
			LessonConsts.SCENARIO, LessonConsts.ACTION, LessonConsts.PREDICT, LessonConsts.SLIDER_CHART);

	// Mirror of AMOUNTS in front/src/lib/lessonMetrics.ts: what the device can fill.
	public static final Set<String> KNOWN_METRICS = Set.of("savingsBalance", "totalAssets");
	public static final String METRIC_PROPERTY = "\"metric\"";

	public static final String CHARACTER = "character";
	public static final String PHONE = "phone";
	public static final String AMOUNT = "amount";
	public static final String CHART = "chart";
	public static final String TAG = "tag";
	public static final Set<String> KINDS = Set.of(CHARACTER, PHONE, AMOUNT, CHART, TAG);

	public static final Set<String> POSES = Set.of("sit", "stand", "phone");
	public static final Set<String> PLACES = Set.of("office", "home", "street", "cafe");
	public static final Set<String> TIMES = Set.of("day", "dusk", "night");
	public static final Set<String> CAMERAS = Set.of("push", "pull", "drift", "none");
	public static final Set<String> TONES = Set.of("good", "bad", "neutral");

	// The only fields a byChoice or noData override may change.
	public static final Set<String> OVERRIDABLE = Set.of("layers", "captions", "desc", "camera", "duration", "audio");

	public static final int MIN_SCENES = 1;
	public static final int MAX_SCENES = 4;
	public static final double MIN_DURATION = 8;
	public static final double MAX_DURATION = 15;
	public static final double MAX_TOTAL = 60;

	public static final int MIN_CAPTIONS = 2;
	public static final int MAX_CAPTIONS = 4;
	public static final double CAPTION_GAP = 2.5;
	public static final int CAPTION_MAX_LENGTH = 70;

	public static final int MIN_MESSAGES = 1;
	public static final int MAX_MESSAGES = 4;
	public static final int MESSAGE_MAX_LENGTH = 40;
	public static final int CHART_MIN_POINTS = 2;
	public static final int CHART_MAX_POINTS = 8;
	public static final int TAG_MAX_LENGTH = 10;

	public static final String PARENT_DIRECTORY = "..";
	public static final String LINK_START = "[[";
	public static final String LINK_END = "]]";
	public static final String LINK_LABEL = "|";
	public static final String BOLD = "**";
	public static final Pattern LABELLED_LINK = Pattern.compile("\\[\\[[a-z0-9-]+\\|([^\\]]*)]]");
	public static final Pattern PLAIN_LINK = Pattern.compile("\\[\\[([a-z0-9-]+)]]");
	public static final Pattern FINAL_PUNCTUATION = Pattern.compile("[.!?]+$");

}
