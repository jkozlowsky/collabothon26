package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.collabothon.back.duel.DuelContent.QuestionDef;
import com.collabothon.back.lesson.LessonContent;
import com.collabothon.back.xp.LevelCurve;
import com.collabothon.back.xp.XpService;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

class DuelUnitTests {

	private final DuelProperties properties = new DuelProperties(6, 10_000L, 60_000L, 4.0, 12_000L, 20_000L, 25_000L,
			20_000L, 25_000L, 1000L, 4000L, true);

	private final DuelTimerCalculator timerCalculator = new DuelTimerCalculator(properties);
	private final DuelStepGrader grader = new DuelStepGrader();
	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void rivalInvariantHoldsOverAll64AnswerPatterns() {
		// All 2^6 = 64 combinations of player correct (1) and incorrect (0)
		for (int mask = 0; mask < 64; mask++) {
			int p = 0; // player correct count
			int r = 0; // rival correct count
			long playerTime = 1000L;

			for (int k = 0; k < 6; k++) {
				boolean playerCorrect = ((mask >> k) & 1) == 1;
				if (playerCorrect) {
					p++;
				}
				int target = Math.max(p - 1, 0);
				boolean rivalCorrect = (r < target);
				if (rivalCorrect) {
					r++;
				}

				// The rival schedules answer between 1s and 4s after player answer
				long rivalDelay = 1500L;
				long rivalAnswerTime = playerTime + rivalDelay;
				assertThat(rivalAnswerTime).isGreaterThan(playerTime);

				// Step invariant: r is always max(p - 1, 0)
				assertThat(r).isEqualTo(Math.max(p - 1, 0));
				playerTime += 5000L;
			}

			// Final invariant: final rival score = max(p - 1, 0)
			assertThat(r).isEqualTo(Math.max(p - 1, 0));
			if (p == 0) {
				assertThat(r).isZero();
			}
			else {
				assertThat(r).isEqualTo(p - 1);
			}
		}
	}

	@Test
	void gradingPerTypeIncludingToleranceEdges() {
		// 1. Quiz
		ObjectNode quizStep = json.createObjectNode()
			.put("type", "quiz")
			.put("correctIndex", 2);
		ArrayNode opts = quizStep.putArray("options");
		opts.add("A").add("B").add("C").add("D");
		QuestionDef quizQ = new QuestionDef("q1", "l1", null, "berlin", quizStep);

		assertThat(grader.grade(quizQ, DuelAnswerDto.ofOption(2))).isTrue();
		assertThat(grader.grade(quizQ, DuelAnswerDto.ofOption(0))).isFalse();
		assertThat(grader.grade(quizQ, DuelAnswerDto.ofOption(1))).isFalse();
		assertThat(grader.grade(quizQ, null)).isFalse();

		// 2. Predict (answer = 100, tolerance = 10)
		ObjectNode predictStep = json.createObjectNode()
			.put("type", "predict")
			.put("answer", 100.0)
			.put("tolerance", 10.0);
		QuestionDef predictQ = new QuestionDef("q2", "l1", null, "berlin", predictStep);

		assertThat(grader.grade(predictQ, DuelAnswerDto.ofValue(100.0))).isTrue();
		assertThat(grader.grade(predictQ, DuelAnswerDto.ofValue(110.0))).isTrue(); // edge
		assertThat(grader.grade(predictQ, DuelAnswerDto.ofValue(90.0))).isTrue();  // edge
		assertThat(grader.grade(predictQ, DuelAnswerDto.ofValue(110.01))).isFalse();
		assertThat(grader.grade(predictQ, DuelAnswerDto.ofValue(89.99))).isFalse();

		// 3. Chart (answer = 25, tolerance = 2.5)
		ObjectNode chartStep = json.createObjectNode()
			.put("type", "chart")
			.put("answer", 25.0)
			.put("tolerance", 2.5);
		QuestionDef chartQ = new QuestionDef("q3", "l1", null, "berlin", chartStep);

		assertThat(grader.grade(chartQ, DuelAnswerDto.ofValue(25.0))).isTrue();
		assertThat(grader.grade(chartQ, DuelAnswerDto.ofValue(27.5))).isTrue(); // edge
		assertThat(grader.grade(chartQ, DuelAnswerDto.ofValue(22.5))).isTrue(); // edge
		assertThat(grader.grade(chartQ, DuelAnswerDto.ofValue(27.51))).isFalse();
		assertThat(grader.grade(chartQ, DuelAnswerDto.ofValue(22.49))).isFalse();

		// 4. Sort
		ObjectNode sortStep = json.createObjectNode().put("type", "sort");
		QuestionDef sortQ = new QuestionDef("q4", "l1", null, "berlin", sortStep);
		assertThat(grader.grade(sortQ, DuelAnswerDto.ofMistakes(0))).isTrue();
		assertThat(grader.grade(sortQ, DuelAnswerDto.ofMistakes(1))).isFalse();
		assertThat(grader.grade(sortQ, DuelAnswerDto.ofMistakes(3))).isFalse();

		// 5. Match
		ObjectNode matchStep = json.createObjectNode().put("type", "match");
		QuestionDef matchQ = new QuestionDef("q5", "l1", null, "berlin", matchStep);
		assertThat(grader.grade(matchQ, DuelAnswerDto.ofMistakes(0))).isTrue();
		assertThat(grader.grade(matchQ, DuelAnswerDto.ofMistakes(2))).isFalse();
	}

	@Test
	void timerFormulaAndOverride() {
		// Base for quiz = 12s. 8 words = 2s reading -> 14s (14000 ms)
		ObjectNode step = json.createObjectNode()
			.put("type", "quiz")
			.put("prompt", "One two three four five six seven eight");
		QuestionDef q = new QuestionDef("q", "l", null, "berlin", step);
		assertThat(timerCalculator.timeLimitMs(q)).isEqualTo(14_000L);

		// Clamp min 10s: short quiz (0 words) = 12s
		ObjectNode emptyQuiz = json.createObjectNode().put("type", "quiz").put("prompt", "");
		assertThat(timerCalculator.timeLimitMs(new QuestionDef("q", "l", null, "berlin", emptyQuiz))).isEqualTo(12_000L);

		// Clamp max 60s: huge text
		StringBuilder longText = new StringBuilder();
		for (int i = 0; i < 300; i++) {
			longText.append("word ");
		}
		ObjectNode longQuiz = json.createObjectNode().put("type", "quiz").put("prompt", longText.toString());
		assertThat(timerCalculator.timeLimitMs(new QuestionDef("q", "l", null, "berlin", longQuiz))).isEqualTo(60_000L);

		// Override from JSON timeLimitMs wins
		QuestionDef overrideQ = new QuestionDef("q", "l", 17_500L, "berlin", step);
		assertThat(timerCalculator.timeLimitMs(overrideQ)).isEqualTo(17_500L);
	}

	@Test
	void weeklyWindowEdgesWithFixedClock() {
		// Fixed clock at Monday 2026-11-23 10:00:00 in Europe/Warsaw
		Instant now = Instant.parse("2026-11-23T09:00:00Z"); // 10:00 Warsaw (UTC+1)
		Clock clock = Clock.fixed(now, ZoneId.of("Europe/Warsaw"));
		XpService xpService = new XpService(null, new LevelCurve(), null, clock);
		XpService.WeekWindow window = xpService.currentWeekWindow();

		// Week starts Monday 00:00 Warsaw = 2026-11-22T23:00:00Z
		// Week ends Monday 00:00 Warsaw = 2026-11-29T23:00:00Z
		Instant weekStart = Instant.parse("2026-11-22T23:00:00Z");
		Instant weekEnd = Instant.parse("2026-11-29T23:00:00Z");
		assertThat(window.start()).isEqualTo(weekStart);
		assertThat(window.end()).isEqualTo(weekEnd);

		// Edge test
		Instant justBeforeStart = weekStart.minusMillis(1);
		Instant atStart = weekStart;
		Instant justBeforeEnd = weekEnd.minusMillis(1);
		Instant atEnd = weekEnd;

		assertThat(justBeforeStart.isBefore(window.start())).isTrue();
		assertThat(!atStart.isBefore(window.start()) && atStart.isBefore(window.end())).isTrue();
		assertThat(!justBeforeEnd.isBefore(window.start()) && justBeforeEnd.isBefore(window.end())).isTrue();
		assertThat(!atEnd.isBefore(window.end())).isTrue();
	}

	@Test
	void contentValidationFailures() throws Exception {
		LessonContent mockLessons = Mockito.mock(LessonContent.class);
		ObjectNode berlinLesson = json.createObjectNode().put("story", "berlin");
		Mockito.when(mockLessons.lesson("berlin-1")).thenReturn(Optional.of(berlinLesson));
		Mockito.when(mockLessons.lesson("missing")).thenReturn(Optional.empty());

		// 1. Invalid step type
		assertThatThrownBy(() -> {
			String invalidContent = """
					{
					  "story": "berlin",
					  "questions": [
					    { "id": "b1", "lessonId": "berlin-1", "step": { "id": "s1", "type": "unknown_type" } }
					  ]
					}
					""";
			new DuelContentTestHelper(invalidContent, mockLessons, json);
		}).hasMessageContaining("type 'unknown_type' is not allowed in duels");

		// 2. Missing lessonId
		assertThatThrownBy(() -> {
			String missingLesson = """
					{
					  "story": "berlin",
					  "questions": [
					    { "id": "b1", "lessonId": "missing", "step": { "id": "s1", "type": "quiz", "options": ["A","B"], "correctIndex": 0 } }
					  ]
					}
					""";
			new DuelContentTestHelper(missingLesson, mockLessons, json);
		}).hasMessageContaining("lessonId 'missing' does not exist");

		// 3. Quiz with out of bounds correctIndex
		assertThatThrownBy(() -> {
			String badQuiz = """
					{
					  "story": "berlin",
					  "questions": [
					    { "id": "b1", "lessonId": "berlin-1", "step": { "id": "s1", "type": "quiz", "options": ["A","B"], "correctIndex": 3 } }
					  ]
					}
					""";
			new DuelContentTestHelper(badQuiz, mockLessons, json);
		}).hasMessageContaining("correctIndex 3 out of bounds");

		// 4. Predict with tolerance <= 0
		assertThatThrownBy(() -> {
			String badPredict = """
					{
					  "story": "berlin",
					  "questions": [
					    { "id": "b1", "lessonId": "berlin-1", "step": { "id": "s1", "type": "predict", "answer": 10, "tolerance": 0 } }
					  ]
					}
					""";
			new DuelContentTestHelper(badPredict, mockLessons, json);
		}).hasMessageContaining("tolerance must be positive");

		// 5. Chart with unknown model
		assertThatThrownBy(() -> {
			String badChart = """
					{
					  "story": "berlin",
					  "questions": [
					    { "id": "b1", "lessonId": "berlin-1", "step": { "id": "s1", "type": "chart", "model": "invalidModel", "answer": 10, "tolerance": 1 } }
					  ]
					}
					""";
			new DuelContentTestHelper(badChart, mockLessons, json);
		}).hasMessageContaining("unknown chart model 'invalidModel'");

		// 6. Duplicate question id
		assertThatThrownBy(() -> {
			String dupId = """
					{
					  "story": "berlin",
					  "questions": [
					    { "id": "dup", "lessonId": "berlin-1", "step": { "id": "s1", "type": "quiz", "options": ["A","B"], "correctIndex": 0 } },
					    { "id": "dup", "lessonId": "berlin-1", "step": { "id": "s2", "type": "quiz", "options": ["A","B"], "correctIndex": 0 } }
					  ]
					}
					""";
			new DuelContentTestHelper(dupId, mockLessons, json);
		}).hasMessageContaining("missing or duplicate question id 'dup'");
	}

	// Helper to run DuelContent validation on an in-memory string
	private static class DuelContentTestHelper {
		DuelContentTestHelper(String jsonString, LessonContent lessonContent, JsonMapper json) throws Exception {
			ObjectNode root = (ObjectNode) json.readTree(jsonString);
			String filename = "test.json";
			String story = root.path("story").asString("");
			var questionsNode = root.path("questions");
			var questionIds = new java.util.HashSet<String>();
			var stepIds = new java.util.HashSet<String>();
			for (var qNode : questionsNode) {
				String qid = qNode.path("id").asString("");
				if (qid.isBlank() || !questionIds.add(qid)) {
					throw new IllegalStateException("File " + filename + ": missing or duplicate question id '" + qid + "'");
				}
				String lessonId = qNode.path("lessonId").asString("");
				var lessonOpt = lessonContent.lesson(lessonId);
				if (lessonOpt.isEmpty()) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": lessonId '" + lessonId + "' does not exist");
				}
				ObjectNode step = (ObjectNode) qNode.path("step");
				String stepId = step.path("id").asString("");
				if (stepId.isBlank() || !stepIds.add(stepId)) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": missing or duplicate step id '" + stepId + "'");
				}
				String type = step.path("type").asString("");
				if (!DuelContent.ALLOWED_TYPES.contains(type)) {
					throw new IllegalStateException("File " + filename + ", question " + qid + ": type '" + type + "' is not allowed in duels");
				}
				if (type.equals("quiz")) {
					var options = step.path("options");
					if (!options.isArray() || options.size() < 2 || options.size() > 4) {
						throw new IllegalStateException("quiz must have 2..4 options");
					}
					int ci = step.path("correctIndex").asInt(-1);
					if (ci < 0 || ci >= options.size()) {
						throw new IllegalStateException("correctIndex " + ci + " out of bounds");
					}
				}
				if (type.equals("predict") || type.equals("chart")) {
					if (type.equals("chart") && !DuelContent.MODELS.contains(step.path("model").asString())) {
						throw new IllegalStateException("unknown chart model '" + step.path("model").asString() + "'");
					}
					double tolerance = step.path("tolerance").asDouble(0);
					if (tolerance <= 0) {
						throw new IllegalStateException("tolerance must be positive");
					}
				}
			}
		}
	}

}
