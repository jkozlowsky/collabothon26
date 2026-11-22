package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static com.collabothon.back.categorization.controllers.TestPool.history;
import static com.collabothon.back.categorization.controllers.TestPool.label;
import static com.collabothon.back.categorization.controllers.TestPool.notSure;
import static com.collabothon.back.categorization.controllers.TestPool.right;
import static com.collabothon.back.categorization.controllers.TestPool.wrong;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.random.RandomGenerator;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restclient.test.autoconfigure.AutoConfigureMockRestServiceServer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
@Transactional
class QuickCheckStepTests {

	private static final String SENTINEL = "zzsentinelzz";

	private static final String JEV_URL = "https://api.typesafe.ai/v1/systemone";

	// The interest below puts saving first, so the test starts in Berlin; debt (São Paulo) and investing (Seoul) follow.
	private static final String BERLIN_1_Q1 = "berlin-1/q1";

	private static final String BERLIN_1_Q2 = "berlin-1/q2";

	private static final String SAO_PAULO_1_Q1 = "sao-paulo-1/q1";

	/** Right on saving, wrong on debt: the rule stays in sao-paulo-1 for its other question. */
	private static final String TWO_ANSWERS = body("1-5y", history(right(BERLIN_1_Q1), wrong(SAO_PAULO_1_Q1)), false);

	/**
	 * What Jev chooses among before the first answer and after one or two of them: two lessons per area, one of each
	 * story where the area has more than one (Berlin and Buenos Aires for saving, Seoul and Tokyo for investing).
	 */
	private static final List<String> CHOICES = List.of("berlin-1", "buenos-aires-1", "sao-paulo-1", "sao-paulo-2",
			"seoul-1", "tokyo-1");

	private static final String FACTS = """
			{"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true,
			 "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}""";

	/** A valid step body: consent with facts, the time-frame tile answered, one knowledge answer. */
	private static final String VALID = """
			{"consent": true, "facts": %s, "profile": {"ageBand": null, "savingsCover": null, "horizon": "1-5y"},
			 "history": [%s], "useRules": true}"""
		.formatted(FACTS, right(BERLIN_1_Q1));

	private static final FixedRandom RANDOM = new FixedRandom();

	@TestBean
	RandomGenerator random;

	static RandomGenerator random() {
		return RANDOM;
	}

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	@Autowired
	LessonContentRepository lessonContent;

	@Autowired
	LessonCompletionRepository completions;

	@Autowired
	JsonMapper json;

	private String userId;

	@BeforeEach
	void ownUser() throws Exception {
		RANDOM.index = 0;
		userId = "step-" + UUID.randomUUID();
		onboard("\"berlin\"");
	}

	private void onboard(String interests) throws Exception {
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"lifeStage": "building", "interests": [%s], "experience": "occasional", "skipped": false}"""
				.formatted(interests)))
			.andExpect(status().isOk());
	}

	@AfterEach
	void verifyJev() {
		jev.verify();
	}

	private ResultActions step(String body) throws Exception {
		return step(userId, body);
	}

	private ResultActions step(String user, String body) throws Exception {
		return mvc.perform(post("/api/users/{id}/quick-check/step", user).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	private static String body(String horizon, String history, boolean useRules) {
		return """
				{"consent": false, "profile": {"ageBand": null, "savingsCover": "1-3", "horizon": %s},
				 "history": [%s], "useRules": %s}""".formatted(horizon == null ? "null" : "\"" + horizon + "\"", history,
				useRules);
	}

	private void completeAllBut(String... lessonIds) {
		lessonContent.allLessons().keySet().stream().filter(id -> !Set.of(lessonIds).contains(id))
			.forEach(id -> completions.insertFirst(userId, id, 10));
	}

	private static ResultMatcher nextIs(String questionId) {
		return MockMvcResultMatchers.jsonPath("$.nextQuestionId").value(questionId);
	}

	private ResultActions next(String history) throws Exception {
		return step(body(null, history, true)).andExpect(status().isOk());
	}

	@Test
	void onRulesAnEmptyHistoryGetsAQuestionOfTheFirstAreasFirstLessonWithoutAskingJev() throws Exception {
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		step(body(null, "", true)).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": null, "debt": null, "investing": null}, "nextQuestionId": "berlin-1/q1",
					 "done": false, "useRules": true, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void theQuestionIsDrawnFromTheLessonsOpenQuestionsAndIsNeverRepeated() throws Exception {
		RANDOM.index = 1;
		next("").andExpect(nextIs(BERLIN_1_Q2));
		// Only the lesson's third question is open, whatever the draw.
		next(history(wrong(BERLIN_1_Q2), wrong(BERLIN_1_Q1))).andExpect(nextIs("berlin-1/q3"));
		RANDOM.index = 0;
		next(wrong(BERLIN_1_Q1)).andExpect(nextIs(BERLIN_1_Q2));
	}

	@Test
	void thePickedPathsAreaIsAskedAboutFirst() throws Exception {
		onboard("\"tokyo\"");

		next("").andExpect(nextIs("seoul-1/q1"));
	}

	@Test
	void useRulesMakesNoJevRequestAndAWrongAnswerStaysInTheLesson() throws Exception {
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		step(body(null, wrong(BERLIN_1_Q1), true)).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25, "debt": null, "investing": null}, "nextQuestionId": "berlin-1/q2",
					 "done": false, "useRules": true, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void afterAWrongAnswerWithNoQuestionLeftInTheLessonTheStorysNextLessonFollows() throws Exception {
		next(history(wrong(BERLIN_1_Q1), notSure(BERLIN_1_Q2), wrong("berlin-1/q3"))).andExpect(nextIs("berlin-2/q1"));
	}

	@Test
	void aRightAnswerMovesToTheFirstAreaWithoutAnAnswer() throws Exception {
		next(right(BERLIN_1_Q1)).andExpect(nextIs(SAO_PAULO_1_Q1));
		// Seoul is the first investing story in stories.json.
		next(history(right(BERLIN_1_Q1), right(SAO_PAULO_1_Q1))).andExpect(nextIs("seoul-1/q1"));
	}

	@Test
	void aRunWithoutAMistakeReturnsToTheFirstAreaWithALessonNotAskedAboutYet() throws Exception {
		next(history(right(BERLIN_1_Q1), right(SAO_PAULO_1_Q1), right("seoul-1/q2")))
			.andExpect(nextIs("berlin-2/q1"))
			.andExpect(content().json("{\"done\": false}", JsonCompareMode.LENIENT));
	}

	@Test
	void aRunWithoutAMistakeGoesOnPastFourToTwoAnswersInEveryAreaAndEndsAtSix() throws Exception {
		String four = history(right(BERLIN_1_Q1), right(SAO_PAULO_1_Q1), right("seoul-1/q2"), right("berlin-2/q1"));

		// Each area's second question comes from its next lesson not asked about yet.
		next(four).andExpect(nextIs("sao-paulo-2/q1"));
		next(history(four, right("sao-paulo-2/q1"))).andExpect(nextIs("seoul-2/q1"));
		step(body(null, history(four, right("sao-paulo-2/q1"), right("seoul-2/q1")), true)).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.85, "debt": 0.85, "investing": 0.85}, "nextQuestionId": null, "done": true,
					 "useRules": true, "stepFellBack": false}""", JsonCompareMode.STRICT));
		// One mistake and the run ends at four answers, as before.
		step(body(null, history(four.replace(right("berlin-2/q1"), wrong("berlin-2/q1"))), true))
			.andExpect(content().json("{\"nextQuestionId\": null, \"done\": true}", JsonCompareMode.LENIENT));
	}

	@Test
	void aCompletedLessonIsNeverAskedAbout() throws Exception {
		completions.insertFirst(userId, "berlin-1", 10);

		next("").andExpect(nextIs("berlin-2/q1"));
	}

	@Test
	void theRuleEndsAfterFourAnswersWithoutANextQuestion() throws Exception {
		step(body(null, history(wrong(BERLIN_1_Q1), wrong(BERLIN_1_Q2), notSure("berlin-2/q1"), right(SAO_PAULO_1_Q1)),
				true))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25, "debt": 0.85, "investing": null}, "nextQuestionId": null, "done": true,
					 "useRules": true, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void aUserWithoutOnboardingIs404() throws Exception {
		step("nobody-" + UUID.randomUUID(), VALID).andExpect(status().isNotFound());
	}

	@Test
	void aValidBodyPasses() throws Exception {
		step(VALID).andExpect(status().isOk());
	}

	static Stream<Arguments> badSteps() {
		String one = "{\"questionId\": \"berlin-1/q1\", \"optionIndex\": 0}";
		return Stream.of(
				Arguments.of("malformed JSON", VALID.substring(0, 20)),
				Arguments.of("missing consent", VALID.replace("\"consent\": true,", "")),
				Arguments.of("missing history", VALID.replaceAll("\"history\": \\[.*?],", "")),
				Arguments.of("facts without consent", VALID.replace("\"consent\": true", "\"consent\": false")),
				Arguments.of("fact outside its set", VALID.replace("\"2-3.5k\"", "\"" + SENTINEL + "\"")),
				Arguments.of("age band outside its set", VALID.replace("\"ageBand\": null", "\"ageBand\": \"30\"")),
				Arguments.of("horizon outside its set", VALID.replace("\"1-5y\"", "\"" + SENTINEL + "\"")),
				Arguments.of("savings cover outside its set",
						body(null, one, true).replace("\"1-3\"", "\"" + SENTINEL + "\"")),
				Arguments.of("savings cover with consent",
						VALID.replace("\"savingsCover\": null", "\"savingsCover\": \"1-3\"")),
				Arguments.of("unknown question", body(null, one.replace("berlin-1/q1", SENTINEL), true)),
				Arguments.of("a lesson without its step", body(null, one.replace("berlin-1/q1", "berlin-1"), true)),
				Arguments.of("repeated question", body(null, one + ", " + one, true)),
				// berlin-1/q1 has three options.
				Arguments.of("option past the last one", body(null, one.replace("\"optionIndex\": 0", "\"optionIndex\": 3"),
						true)),
				Arguments.of("negative option", body(null, one.replace("\"optionIndex\": 0", "\"optionIndex\": -1"),
						true)));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("badSteps")
	void aBadStepIs400WithoutEchoingTheValue(String name, String body) throws Exception {
		String response = step(body).andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();

		assertFalse(response.contains(SENTINEL), response);
	}

	@Test
	void aBlankOrTooLongUserIdIs400() throws Exception {
		step(" ", VALID).andExpect(status().isBadRequest());
		step("x".repeat(65), VALID).andExpect(status().isBadRequest());
	}

	/** A contract-valid Jev step answer; {@code nextLesson} null leaves the next question out. */
	private static String jevStep(String mastery, String nextLesson, List<String> lessons, double enough) {
		StringBuilder answers = new StringBuilder(mastery);
		if (nextLesson != null) {
			answers.append(", ").append(nextAnswer(nextLesson, lessons));
		}
		answers.append(", \"enough\": {\"type\": \"noul\", \"noul\": %s}".formatted(enough));
		return "{\"model\": \"jev-2026-05\", \"answers\": {" + answers + "}}";
	}

	/** Jev's answer before the first knowledge answer: the lesson and nothing else. */
	private static String jevFirst(String lesson, List<String> lessons) {
		return "{\"model\": \"jev-2026-05\", \"answers\": {" + nextAnswer(lesson, lessons) + "}}";
	}

	private static String nextAnswer(String nextLesson, List<String> lessons) {
		StringBuilder probabilities = new StringBuilder();
		for (String lesson : lessons) {
			probabilities.append(probabilities.isEmpty() ? "" : ", ")
				.append("\"%s\": %s".formatted(label(lesson), lesson.equals(nextLesson) ? "0.7" : "0.05"));
		}
		return "\"next\": {\"type\": \"choice\", \"choice\": \"%s\", \"confidence\": 0.7, \"probabilities\": {%s}}"
			.formatted(label(nextLesson), probabilities);
	}

	private static final String MASTERY_BOTH = """
			"mastery_saving": {"type": "noul", "noul": 0.8}, "mastery_debt": {"type": "noul", "noul": 0.3}""";

	private static ResponseCreator jevReplies(String answer) {
		return withSuccess(answer, MediaType.APPLICATION_JSON);
	}

	// An interrupted wait is the step timeout cancelling the call; the stub still answers so the server sees no error.
	private static ResponseCreator after(Duration delay, ResponseCreator response) {
		return request -> {
			try {
				Thread.sleep(delay);
			}
			catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
			return response.createResponse(request);
		};
	}

	@Test
	void jevRatesMasteryAndPicksTheNextLessonFromTheSpecifiedRequest() throws Exception {
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(jevReplies(jevStep(MASTERY_BOTH, "tokyo-1", CHOICES, 0.2)));
		// Of Jev's lesson, the second question is drawn.
		RANDOM.index = 1;

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "debt": 0.3, "investing": null}, "nextQuestionId": "tokyo-1/q2",
					 "done": false, "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));

		assertEquals("jev-1.14.0", sent.get().get("model").stringValue());
		assertEquals(json.readTree("""
				{"profile": {"savingsCover": "1-3", "horizon": "1-5y"}, "interests": [%s],
				 "answers": [
				   {"area": "saving", "lessonId": "berlin-1", "topic": "Why safe money can lose value",
				    "concepts": ["inflation", "real-return", "fixed-term-deposit", "time-horizon"], "result": "correct"},
				   {"area": "debt", "lessonId": "sao-paulo-1", "topic": "The interest in \\"no interest\\"",
				    "concepts": ["installments", "hidden-interest"], "result": "wrong"}]}""".formatted(TestPool.interest("berlin"))),
				sent.get().get("state"));
		JsonNode spec = SpecBlocks.read(json, "jev-step-questions");
		ObjectNode expected = json.createObjectNode();
		expected.set("mastery_saving", spec.get("mastery_saving"));
		expected.set("mastery_debt", spec.get("mastery_debt"));
		ObjectNode next = (ObjectNode) spec.get("next").deepCopy();
		ObjectNode criteria = next.putObject("criteria");
		CHOICES.forEach(lesson -> criteria.set(label(lesson), TestPool.criterion(lesson)));
		expected.set("next", next);
		expected.set("enough", spec.get("enough"));
		assertEquals(expected, sent.get().get("questions"));
		// One option written out, so the name and the description are pinned as text too.
		assertEquals(json.readTree("""
				{"topic": "Why safe money can lose value",
				 "concepts": ["inflation", "real return", "fixed term deposit", "time horizon"]}"""),
				sent.get().at("/questions/next/criteria/why_safe_money_can_lose_value"));
		assertEquals(json.readTree("""
				{"topic": "Small payments that add up", "concepts": ["installments", "committed income"]}"""),
				sent.get().at("/questions/next/criteria/small_payments_that_add_up"));
	}

	@Test
	void beforeTheFirstAnswerJevPicksTheLessonFromTheSpecifiedRequest() throws Exception {
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(jevReplies(jevFirst("tokyo-1", CHOICES)));

		step(VALID.replaceAll("\"history\": \\[.*?]", "\"history\": []").replace("\"useRules\": true", "\"useRules\": false"))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": null, "debt": null, "investing": null}, "nextQuestionId": "tokyo-1/q1",
					 "done": false, "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));

		// No `answers` key and no empty range: either would read as a signal.
		assertEquals(json.readTree("""
				{"profile": {"horizon": "1-5y"}, "interests": [%s],
				 "facts": %s}""".formatted(TestPool.interest("berlin"), FACTS)), sent.get().get("state"));
		ObjectNode first = (ObjectNode) SpecBlocks.read(json, "jev-step-questions").get("first").deepCopy();
		ObjectNode criteria = first.putObject("criteria");
		CHOICES.forEach(lesson -> criteria.set(label(lesson), TestPool.criterion(lesson)));
		// The first wording goes out as `next`, the one question of this call: no mastery, no `enough`.
		assertEquals(json.createObjectNode().set("next", first), sent.get().get("questions"));
	}

	@Test
	void withoutConsentTheFirstStepSendsNoFacts() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts").doesNotExist())
			.andExpect(jsonPath("$.state.answers").doesNotExist())
			.andExpect(jsonPath("$.state.interests[0].category").value("Inflation & savings"))
			.andExpect(jsonPath("$.state.profile.horizon").value("1-5y"))
			.andRespond(jevReplies(jevFirst("sao-paulo-2", CHOICES)));

		step(body("1-5y", "", false)).andExpect(status().isOk()).andExpect(nextIs("sao-paulo-2/q1"));
	}

	@Test
	void withoutInterestsTheStepLeavesThemOutOfTheState() throws Exception {
		onboard("");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.profile").exists())
			.andExpect(jsonPath("$.state.interests").doesNotExist())
			.andRespond(jevReplies(jevFirst("berlin-1", CHOICES)));

		step(body("1-5y", "", false)).andExpect(status().isOk()).andExpect(nextIs(BERLIN_1_Q1));
	}

	@Test
	void withNoAnswerGivenAtOnboardingTheStepSendsNeitherGoalsNorInterests() throws Exception {
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"interests\": [], \"skipped\": false}")).andExpect(status().isOk());
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.goals").doesNotExist())
			.andExpect(jsonPath("$.state.interests").doesNotExist())
			.andExpect(jsonPath("$.state.profile.horizon").value("1-5y"))
			.andRespond(jevReplies(jevFirst("sao-paulo-2", CHOICES)));

		step(body("1-5y", "", false)).andExpect(status().isOk()).andExpect(nextIs("sao-paulo-2/q1"));
	}

	static Stream<Arguments> brokenFirstSteps() {
		List<String> withBerlin3 = List.of("berlin-1", "berlin-3", "sao-paulo-1", "sao-paulo-2", "seoul-1", "tokyo-1");
		return Stream.of(
				Arguments.of("500", withServerError()),
				Arguments.of("read timeout", withException(new SocketTimeoutException())),
				Arguments.of("a lesson outside the choices", jevReplies(jevFirst("berlin-3", withBerlin3))),
				Arguments.of("no lesson", jevReplies("{\"model\": \"jev-2026-05\", \"answers\": {}}")),
				Arguments.of("not JSON", withSuccess("not json", MediaType.APPLICATION_JSON)));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("brokenFirstSteps")
	void aBrokenFirstJevStepStartsInTheRulesLessonAndSwitchesToRules(String name, ResponseCreator response)
			throws Exception {
		jev.expect(requestTo(JEV_URL)).andRespond(response);

		step(body("1-5y", "", false)).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": null, "debt": null, "investing": null}, "nextQuestionId": "berlin-1/q1",
					 "done": false, "useRules": false, "stepFellBack": true}""", JsonCompareMode.STRICT));
	}

	@Test
	void withOneLessonLeftTheFirstStepDoesNotAskJev() throws Exception {
		completeAllBut("berlin-1");
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		step(body("1-5y", "", false)).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": null, "debt": null, "investing": null}, "nextQuestionId": "berlin-1/q1",
					 "done": false, "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void withConsentTheFactsReachJev() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts.incomeBand").value("2-3.5k"))
			.andExpect(jsonPath("$.state.profile.horizon").value("1-5y"))
			.andRespond(jevReplies(jevStep("\"mastery_saving\": {\"type\": \"noul\", \"noul\": 0.9}", "sao-paulo-2",
					CHOICES, 0.1)));

		step(VALID.replace("\"useRules\": true", "\"useRules\": false")).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.9, "debt": null, "investing": null}, "nextQuestionId": "sao-paulo-2/q1",
					 "done": false, "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	static Stream<Arguments> brokenSteps() {
		// Berlin's third lesson is not among the lessons Jev was given: two per area.
		List<String> withBerlin3 = List.of("berlin-1", "berlin-3", "sao-paulo-1", "sao-paulo-2", "seoul-1", "tokyo-1");
		return Stream.of(
				Arguments.of("500", withServerError()),
				Arguments.of("read timeout", withException(new SocketTimeoutException())),
				Arguments.of("a lesson outside the choices",
						jevReplies(jevStep(MASTERY_BOTH, "berlin-3", withBerlin3, 0.2))),
				Arguments.of("missing mastery", jevReplies(jevStep(MASTERY_BOTH.replace("mastery_debt", "other"),
						"tokyo-1", CHOICES, 0.2))),
				Arguments.of("probability above 1",
						jevReplies(jevStep(MASTERY_BOTH, "tokyo-1", CHOICES, 1.2))),
				Arguments.of("missing enough",
						jevReplies(jevStep(MASTERY_BOTH, "tokyo-1", CHOICES, 0.2).replace("enough", "other"))),
				Arguments.of("not JSON", withSuccess("not json", MediaType.APPLICATION_JSON)));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("brokenSteps")
	void aBrokenJevStepRunsOnTheRuleAndSwitchesToRules(String name, ResponseCreator response) throws Exception {
		jev.expect(requestTo(JEV_URL)).andRespond(response);

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.85, "debt": 0.25, "investing": null}, "nextQuestionId": "sao-paulo-1/q2",
					 "done": false, "useRules": false, "stepFellBack": true}""", JsonCompareMode.STRICT));
	}

	@Test
	void jevSlowerThanThreeSecondsIsCutOffAndTheRuleTakesOver() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(after(Duration.ofMillis(3300), jevReplies(jevStep(MASTERY_BOTH, "tokyo-1", CHOICES,
					0.2))));

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"sao-paulo-1/q2\", \"useRules\": false, \"stepFellBack\": true}",
					JsonCompareMode.LENIENT));
	}

	@Test
	void jevOverTheBudgetKeepsItsMasteryButTheRulePicksTheNextLesson() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(after(Duration.ofMillis(1600), jevReplies(jevStep(MASTERY_BOTH, "tokyo-1", CHOICES,
					0.2))));

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "debt": 0.3, "investing": null}, "nextQuestionId": "sao-paulo-1/q2",
					 "done": false, "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void withOneLessonLeftJevIsNotAskedForTheNextAndItsQuestionComesNext() throws Exception {
		completeAllBut("berlin-1");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.questions.next").doesNotExist())
			.andExpect(jsonPath("$.questions.enough").exists())
			.andRespond(jevReplies(jevStep("\"mastery_saving\": {\"type\": \"noul\", \"noul\": 0.8}", null, List.of(),
					0.2)));

		step(body("1-5y", right(BERLIN_1_Q1), false)).andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"berlin-1/q2\", \"done\": false}", JsonCompareMode.LENIENT));
	}

	@Test
	void enoughAfterThreeAnswersEndsTheTest() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(jevReplies(jevStep(MASTERY_BOTH, "tokyo-1",
					CHOICES, 0.75)));

		step(body("1-5y", history(right(BERLIN_1_Q1), wrong(SAO_PAULO_1_Q1), right(BERLIN_1_Q2)), false))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "debt": 0.3, "investing": null}, "nextQuestionId": null, "done": true,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void afterAFallbackTheStepStaysOnTheRuleWithoutAskingJev() throws Exception {
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		step(TWO_ANSWERS.replace("\"useRules\": false", "\"useRules\": false, \"stepFellBack\": true")).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.85, "debt": 0.25, "investing": null}, "nextQuestionId": "sao-paulo-1/q2",
					 "done": false, "useRules": false, "stepFellBack": true}""", JsonCompareMode.STRICT));
	}

	@Test
	void overTheBudgetJevsEnoughStillEndsTheTest() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(after(Duration.ofMillis(1600), jevReplies(jevStep(MASTERY_BOTH, "tokyo-1",
					CHOICES, 0.75))));

		step(body("1-5y", history(right(BERLIN_1_Q1), wrong(SAO_PAULO_1_Q1), right(BERLIN_1_Q2)), false))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "debt": 0.3, "investing": null}, "nextQuestionId": null, "done": true,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void sevenDistinctAnswersAre400() throws Exception {
		List<String> seven = List.of(BERLIN_1_Q1, BERLIN_1_Q2, "berlin-2/q1", "berlin-1/q3", SAO_PAULO_1_Q1,
				"seoul-1/q2", "seoul-3/q1");

		step(body(null, history(seven.stream().map(TestPool::notSure).toArray(String[]::new)), true))
			.andExpect(status().isBadRequest());
		step(body(null, history(seven.stream().limit(6).map(TestPool::notSure).toArray(String[]::new)), true))
			.andExpect(status().isOk());
	}

}
