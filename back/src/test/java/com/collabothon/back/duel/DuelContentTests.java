package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Reads the content files directly, independently of the backend's models. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DuelContentTests {

	private static final Set<String> ALLOWED_STEP_TYPES = Set.of("quiz", "predict", "chart", "sort", "match");

	private static final Set<String> ALLOWED_CHART_MODELS = Set.of(
			"drawdownRecovery", "leverage", "oneCompanyCrash", "realValue", "installmentCost", "countryMix"
	);

	private final JsonMapper json = JsonMapper.builder().build();

	private final Map<String, StoryInfo> stories = new HashMap<>();

	private final Map<String, LessonInfo> lessons = new HashMap<>();

	private final List<DuelFileInfo> duelFiles = new ArrayList<>();

	@BeforeAll
	void loadContent() throws IOException {
		Path contentDir = findContentDir();
		assertThat(contentDir).as("content directory exists").isNotNull();

		// Load stories
		Path storiesFile = contentDir.resolve("stories.json");
		assertThat(storiesFile).as("stories.json exists").exists();
		try (InputStream in = Files.newInputStream(storiesFile)) {
			JsonNode storiesArray = json.readTree(in);
			for (JsonNode s : storiesArray) {
				String id = s.path("id").asString();
				String category = s.path("category").asString();
				List<String> lessonIds = new ArrayList<>();
				for (JsonNode lid : s.path("lessonIds")) {
					lessonIds.add(lid.asString());
				}
				stories.put(id, new StoryInfo(id, category, List.copyOf(lessonIds)));
			}
		}

		// Load lessons
		Path lessonsDir = contentDir.resolve("lessons");
		assertThat(lessonsDir).as("lessons directory exists").isDirectory();
		try (Stream<Path> stream = Files.list(lessonsDir)) {
			List<Path> lessonFiles = stream.filter(p -> p.toString().endsWith(".json")).toList();
			for (Path lf : lessonFiles) {
				try (InputStream in = Files.newInputStream(lf)) {
					JsonNode node = json.readTree(in);
					String id = node.path("id").asString();
					String story = node.path("story").asString();
					Set<String> stepIds = new HashSet<>();
					for (JsonNode step : node.path("steps")) {
						stepIds.add(step.path("id").asString());
					}
					lessons.put(id, new LessonInfo(id, story, Set.copyOf(stepIds)));
				}
			}
		}

		// Load duel files
		Path duelDir = contentDir.resolve("duel");
		assertThat(duelDir).as("duel directory exists").isDirectory();
		try (Stream<Path> stream = Files.list(duelDir)) {
			List<Path> duelFileList = stream.filter(p -> p.toString().endsWith(".json")).sorted().toList();
			for (Path df : duelFileList) {
				try (InputStream in = Files.newInputStream(df)) {
					JsonNode root = json.readTree(in);
					String story = root.path("story").asString();
					List<JsonNode> questions = new ArrayList<>();
					for (JsonNode q : root.path("questions")) {
						questions.add(q);
					}
					duelFiles.add(new DuelFileInfo(df.getFileName().toString(), story, List.copyOf(questions)));
				}
			}
		}
	}

	@Test
	void allDuelStoriesExistInStoriesJson() {
		assertThat(duelFiles).isNotEmpty();
		for (DuelFileInfo df : duelFiles) {
			assertThat(stories)
					.as("Story '%s' in file %s must exist in stories.json", df.story(), df.fileName())
					.containsKey(df.story());
		}
	}

	@Test
	void allDuelFilesHaveRequiredMinimumQuestionCount() {
		for (DuelFileInfo df : duelFiles) {
			StoryInfo story = stories.get(df.story());
			assertThat(story).isNotNull();
			boolean isFullStory = story.lessonIds().size() > 1;
			int minExpected = isFullStory ? 15 : 3;
			assertThat(df.questions().size())
					.as("Story '%s' (%s) must have >= %d questions, got %d",
							df.story(), isFullStory ? "full" : "1-lesson", minExpected, df.questions().size())
					.isGreaterThanOrEqualTo(minExpected);
		}
	}

	@Test
	void questionIdsAreUniqueAcrossAllFiles() {
		Set<String> seenIds = new HashSet<>();
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				String id = q.path("id").asString();
				assertThat(id).as("Question id in %s must not be blank", df.fileName()).isNotBlank();
				assertThat(seenIds.add(id))
						.as("Question id '%s' in %s must be globally unique across all duel files", id, df.fileName())
						.isTrue();
			}
		}
	}

	@Test
	void stepIdsAreUniqueWithinEachFile() {
		for (DuelFileInfo df : duelFiles) {
			Set<String> seenStepIds = new HashSet<>();
			for (JsonNode q : df.questions()) {
				String stepId = q.path("step").path("id").asString();
				assertThat(stepId)
						.as("Step id in question '%s' of %s must not be blank", q.path("id").asString(), df.fileName())
						.isNotBlank();
				assertThat(seenStepIds.add(stepId))
						.as("Step id '%s' in %s must be unique within file", stepId, df.fileName())
						.isTrue();
			}
		}
	}

	@Test
	void lessonsAndSourceStepsExistAndBelongToStory() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				String qid = q.path("id").asString();
				String lessonId = q.path("lessonId").asString();
				assertThat(lessonId).as("Question '%s' has lessonId", qid).isNotBlank();
				assertThat(lessons).as("Question '%s' references existing lesson '%s'", qid, lessonId).containsKey(lessonId);

				LessonInfo lesson = lessons.get(lessonId);
				assertThat(lesson.story())
						.as("Question '%s' lesson '%s' belongs to story '%s', expected '%s'",
								qid, lessonId, lesson.story(), df.story())
						.isEqualTo(df.story());

				String sourceStepId = q.path("sourceStepId").asString();
				assertThat(sourceStepId).as("Question '%s' has sourceStepId", qid).isNotBlank();
				assertThat(lesson.stepIds())
						.as("Question '%s' sourceStepId '%s' must exist in lesson '%s'", qid, sourceStepId, lessonId)
						.contains(sourceStepId);
			}
		}
	}

	@Test
	void conceptsAreNotEmpty() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				String qid = q.path("id").asString();
				JsonNode concepts = q.path("concepts");
				assertThat(concepts.isArray())
						.as("Question '%s' concepts must be an array", qid)
						.isTrue();
				assertThat(concepts.size())
						.as("Question '%s' concepts must not be empty", qid)
						.isGreaterThanOrEqualTo(1);
			}
		}
	}

	@Test
	void stepTypesAreKnownToGrader() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				String qid = q.path("id").asString();
				String type = q.path("step").path("type").asString();
				assertThat(ALLOWED_STEP_TYPES)
						.as("Question '%s' type '%s' must be recognized by grader", qid, type)
						.contains(type);
			}
		}
	}

	@Test
	void predictAndChartSlidersAreValid() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				JsonNode step = q.path("step");
				String type = step.path("type").asString();
				if (!"predict".equals(type) && !"chart".equals(type)) {
					continue;
				}
				String qid = q.path("id").asString();

				assertThat(step.hasNonNull("tolerance"))
						.as("Question '%s' (%s) must have tolerance", qid, type)
						.isTrue();
				double tolerance = step.path("tolerance").asDouble();
				assertThat(tolerance)
						.as("Question '%s' (%s) tolerance must be positive", qid, type)
						.isGreaterThan(0.0);

				assertThat(step.hasNonNull("answer"))
						.as("Question '%s' (%s) must have answer", qid, type)
						.isTrue();
				double answer = step.path("answer").asDouble();

				JsonNode input = step.path("input");
				assertThat(input.isObject())
						.as("Question '%s' (%s) must have input object", qid, type)
						.isTrue();
				double min = input.path("min").asDouble();
				double max = input.path("max").asDouble();
				double sliderStep = input.path("step").asDouble();

				assertThat(answer)
						.as("Question '%s' answer %.2f inside [%.2f, %.2f]", qid, answer, min, max)
						.isBetween(min, max);

				// Step boundary check
				double stepsCount = Math.round((answer - min) / sliderStep);
				double onStep = min + stepsCount * sliderStep;
				assertThat(Math.abs(answer - onStep))
						.as("Question '%s' answer %.2f must be on slider step boundary (step=%.2f, min=%.2f)",
								qid, answer, sliderStep, min)
						.isLessThan(1e-6);

				// Tolerance rule: |answer - min| > tolerance
				assertThat(Math.abs(answer - min))
						.as("Question '%s' |answer - min| (%.2f) must be > tolerance (%.2f)",
								qid, Math.abs(answer - min), tolerance)
						.isGreaterThan(tolerance);

				if ("chart".equals(type)) {
					String model = step.path("model").asString();
					assertThat(ALLOWED_CHART_MODELS)
							.as("Question '%s' chart model '%s' must be valid", qid, model)
							.contains(model);
				}
			}
		}
	}

	@Test
	void quizStructureIsValid() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				JsonNode step = q.path("step");
				if (!"quiz".equals(step.path("type").asString())) {
					continue;
				}
				String qid = q.path("id").asString();
				JsonNode options = step.path("options");

				assertThat(options.isArray())
						.as("Quiz question '%s' must have options array", qid)
						.isTrue();
				assertThat(options.size())
						.as("Quiz question '%s' must have at least 3 options (and <= 4)", qid)
						.isBetween(3, 4);

				Set<String> uniqueOptions = new HashSet<>();
				for (JsonNode opt : options) {
					String text = opt.asString();
					assertThat(uniqueOptions.add(text))
							.as("Quiz question '%s' has duplicate option '%s'", qid, text)
							.isTrue();
					assertThat(text.length())
							.as("Quiz question '%s' option exceeds 80 characters: '%s'", qid, text)
							.isLessThanOrEqualTo(80);
				}

				assertThat(step.hasNonNull("correctIndex"))
						.as("Quiz question '%s' must specify correctIndex", qid)
						.isTrue();
				int correctIndex = step.path("correctIndex").asInt(-1);
				assertThat(correctIndex)
						.as("Quiz question '%s' correctIndex %d must be in bounds [0, %d)", qid, correctIndex, options.size())
						.isBetween(0, options.size() - 1);
			}
		}
	}

	@Test
	void sortStructureIsValid() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				JsonNode step = q.path("step");
				if (!"sort".equals(step.path("type").asString())) {
					continue;
				}
				String qid = q.path("id").asString();
				JsonNode buckets = step.path("buckets");
				JsonNode items = step.path("items");

				assertThat(buckets.isArray() && buckets.size() >= 2)
						.as("Sort question '%s' must have >= 2 buckets", qid)
						.isTrue();
				assertThat(items.isArray() && items.size() >= 2)
						.as("Sort question '%s' must have >= 2 items", qid)
						.isTrue();

				int numBuckets = buckets.size();
				for (JsonNode item : items) {
					int b = item.path("bucket").asInt(-1);
					assertThat(b)
							.as("Sort item in question '%s' bucket %d out of bounds [0, %d)", qid, b, numBuckets)
							.isBetween(0, numBuckets - 1);
				}
			}
		}
	}

	@Test
	void matchStructureIsValid() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				JsonNode step = q.path("step");
				if (!"match".equals(step.path("type").asString())) {
					continue;
				}
				String qid = q.path("id").asString();
				JsonNode pairs = step.path("pairs");

				assertThat(pairs.isArray() && pairs.size() >= 2)
						.as("Match question '%s' must have >= 2 pairs", qid)
						.isTrue();

				Set<String> lefts = new HashSet<>();
				Set<String> rights = new HashSet<>();
				for (JsonNode pair : pairs) {
					assertThat(pair.size()).as("Match pair must have 2 elements in question '%s'", qid).isEqualTo(2);
					String left = pair.get(0).asString();
					String right = pair.get(1).asString();
					assertThat(lefts.add(left))
							.as("Match question '%s' duplicate left item '%s'", qid, left)
							.isTrue();
					assertThat(rights.add(right))
							.as("Match question '%s' duplicate right item '%s'", qid, right)
							.isTrue();
				}
			}
		}
	}

	@Test
	void promptLengthsDoNotExceedLimit() {
		for (DuelFileInfo df : duelFiles) {
			for (JsonNode q : df.questions()) {
				String qid = q.path("id").asString();
				String prompt = q.path("step").path("prompt").asString();
				assertThat(prompt)
						.as("Question '%s' prompt must not be blank", qid)
						.isNotBlank();
				assertThat(prompt.length())
						.as("Question '%s' prompt exceeds 200 characters (%d chars): '%s'", qid, prompt.length(), prompt)
						.isLessThanOrEqualTo(200);
			}
		}
	}

	private static Path findContentDir() {
		Path[] candidates = new Path[] {
				Path.of("src/main/resources/content"),
				Path.of("back/src/main/resources/content"),
				Path.of("../back/src/main/resources/content")
		};
		for (Path candidate : candidates) {
			if (Files.isDirectory(candidate)) {
				return candidate;
			}
		}
		return null;
	}

}
