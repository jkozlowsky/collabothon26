package com.collabothon.back.lesson.consts;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import com.collabothon.back.common.consts.WebConsts;

public final class LessonConsts {

	public static final int MAX_ID_LENGTH = 64;

	public static final LocalDate EARLIEST_COMPLETION_DAY = LocalDate.of(1, 1, 1);
	public static final int MAX_COMPLETION_DAYS_AHEAD = 1;

	public static final String LESSON_FILES = "classpath:content/lessons/*.json";
	public static final String LESSON_FILE_SUFFIX = ".json";
	public static final String STORIES_FILE = "content/stories.json";
	public static final String AUDIO_FILES = "classpath:static" + WebConsts.AUDIO_BASE;

	public static final String STATUS_DONE = "done";
	public static final String STATUS_AVAILABLE = "available";
	public static final String STATUS_LOCKED = "locked";

	public static final String STORY_AVAILABLE = "available";
	public static final String DEFAULT_STORY_COLOR = "slate";
	public static final String AREA_MONEY_BASICS = "money-basics";
	public static final String AREA_SAVING = "saving";
	public static final String AREA_BORROWING = "borrowing";
	public static final String AREA_INVESTING = "investing";
	public static final String AREA_RISK = "risk";
	public static final List<String> CANONICAL_AREA_SLUGS = List.of(AREA_MONEY_BASICS, AREA_SAVING, AREA_BORROWING,
			AREA_INVESTING, AREA_RISK);
	public static final Pattern WHITESPACE = Pattern.compile("\\s+");

	public static final String TEXT = "text";
	public static final String CHAT = "chat";
	public static final String QUIZ = "quiz";
	public static final String MATCH = "match";
	public static final String SORT = "sort";
	public static final String PREDICT = "predict";
	public static final String SLIDER_CHART = "slider-chart";
	public static final String SCENARIO = "scenario";
	public static final String ACTION = "action";
	public static final Set<String> STEP_TYPES = Set.of(TEXT, CHAT, QUIZ, MATCH, SORT, PREDICT, SLIDER_CHART, SCENARIO,
			ACTION);

	// Steps with a right answer; a wrong first try sends them to the repeat queue.
	public static final Set<String> GRADED = Set.of(QUIZ, MATCH, SORT);

	public static final String LEARN = "learn";
	public static final String CHALLENGE = "challenge";
	public static final String YOU = "you";
	public static final String DECIDE = "decide";
	public static final List<String> PHASES = List.of(LEARN, CHALLENGE, YOU, DECIDE);
	public static final List<String> REQUIRED_PHASES = List.of(LEARN, CHALLENGE, YOU);

	public static final String LEVEL_PREFIX = "level:";
	public static final String PERSONA_PREFIX = "persona:";
	public static final String LEVEL_BEGINNER = LEVEL_PREFIX + "beginner";
	public static final String LEVEL_ADVANCED = LEVEL_PREFIX + "advanced";
	public static final String PERSONA_STUDENT = PERSONA_PREFIX + "student";
	public static final String PERSONA_FAMILY = PERSONA_PREFIX + "family";
	public static final String PERSONA_PRE_RETIREMENT = PERSONA_PREFIX + "pre-retirement";
	public static final Set<String> VARIANT_KEYS = Set.of(LEVEL_BEGINNER, LEVEL_ADVANCED, PERSONA_STUDENT,
			PERSONA_FAMILY, PERSONA_PRE_RETIREMENT);
	// Later wins: base, level, persona.
	public static final List<String> VARIANT_ORDER = List.of(LEVEL_PREFIX, PERSONA_PREFIX);
	public static final List<String> ANSWER_FIELDS = List.of("correctIndex", "answer", "pairs", "model");

	// Mirror of the slider-chart models in front/src/lib/models.ts.
	public static final Set<String> MODELS = Set.of("drawdownRecovery", "leverage", "oneCompanyCrash", "realValue",
			"installmentCost", "countryMix", "monthlyPlan", "currencyMove", "compoundGrowth");

	// Mirror of NUMBERS in front/src/lib/lessonMetrics.ts: what a slider can start from (fromBank).
	public static final Set<String> NUMBER_METRICS = Set.of("worldShare", "europeShare", "largestPositionShare",
			"monthlyInvesting", "savingsBalance", "savingsRate");

	// [[concept]] or [[concept|shown text]] inside any text field.
	public static final Pattern CONCEPT_REF = Pattern.compile("\\[\\[([a-z0-9-]+)(?:\\|[^\\]]*)?]]");

	public static final int MATCH_MIN_PAIRS = 3;
	public static final int MATCH_MAX_PAIRS = 5;
	public static final int SORT_BUCKETS = 2;
	public static final int SCENARIO_MIN_CHOICES = 2;
	public static final int SCENARIO_MIN_SERIES = 2;
	public static final int QUIZ_CHART_MIN_POINTS = 2;
	public static final int QUIZ_CHART_MAX_POINTS = 12;

}
