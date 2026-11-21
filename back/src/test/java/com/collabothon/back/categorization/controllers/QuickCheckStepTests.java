package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;

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

	private static final String RIGHT_SV_A = "{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"sure\"}";

	private static final String WRONG_IN_A = "{\"questionId\": \"in-a\", \"optionIndex\": 1, \"confidence\": \"guessing\"}";

	/** Right on saving, wrong on investing: the rule goes on with investing's other easy question. */
	private static final String TWO_ANSWERS = body("1-5y", RIGHT_SV_A + ", " + WRONG_IN_A, false);

	private static final List<String> UNASKED_AFTER_TWO = List.of("in-hard", "short-term-fall", "sv-b", "sv-hard");

	private static final String FACTS = """
			{"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true,
			 "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}""";

	/** A valid step body: consent with facts, the time-frame tile answered, one knowledge answer. */
	private static final String VALID = """
			{"consent": true, "facts": %s, "profile": {"ageBand": null, "savingsCover": null, "horizon": "1-5y"},
			 "history": [{"questionId": "sv-a", "optionIndex": 0, "confidence": "sure"}], "useRules": true}"""
		.formatted(FACTS);

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	JsonMapper json;

	private String userId;

	private TestBank bank;

	@BeforeEach
	void ownBankAndUser() throws Exception {
		bank = new TestBank(jdbc);
		bank.question("sv-a", "berlin-3", "saving", "easy");
		bank.question("sv-b", "berlin-1", "saving", "easy");
		bank.question("sv-hard", "berlin-3", "saving", "hard");
		bank.question("in-a", "berlin-2", "investing", "easy");
		bank.question("short-term-fall", "berlin-4", "investing", "easy");
		bank.question("in-hard", "berlin-2", "investing", "hard");
		userId = "step-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"lifeStage\": \"building\", \"goals\": [\"start-saving\"], \"experience\": \"occasional\","
					+ " \"skipped\": false}"))
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

	@Test
	void anEmptyHistoryGetsTheRulesFirstQuestionWithoutAskingJev() throws Exception {
		step(body(null, "", false)).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": null, "investing": null}, "nextQuestionId": "sv-a", "done": false,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void useRulesMakesNoJevRequestAndStaysOnRules() throws Exception {
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		step(body(null, "{\"questionId\": \"sv-a\", \"optionIndex\": 1, \"confidence\": \"sure\"}", true))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25, "investing": null}, "nextQuestionId": "sv-b", "done": false,
					 "useRules": true, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void aShortHorizonGetsTheFallBeforeYouNeedItAndNeverTheShortTermFallOnTheRulePath() throws Exception {
		bank.question("fall-before-you-need-it", "berlin-3", "saving", "easy");

		step(body("within-1y", "", true)).andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"fall-before-you-need-it\"}", JsonCompareMode.LENIENT));
		// Wrong on in-a: a 1-5y user would get the short-term fall, a within-1y user the hard investing question.
		String history = RIGHT_SV_A + ", " + WRONG_IN_A;
		step(body("1-5y", history, true)).andExpect(content().json("{\"nextQuestionId\": \"short-term-fall\"}", JsonCompareMode.LENIENT));
		step(body("within-1y", history, true)).andExpect(content().json("{\"nextQuestionId\": \"in-hard\"}", JsonCompareMode.LENIENT));
	}

	@Test
	void theRuleEndsAfterFourAnswersWithoutANextQuestion() throws Exception {
		step(body(null, """
				{"questionId": "sv-a", "optionIndex": 1, "confidence": "sure"},
				{"questionId": "sv-b", "optionIndex": 2, "confidence": "guessing"},
				{"questionId": "sv-hard", "optionIndex": null, "confidence": null},
				{"questionId": "in-a", "optionIndex": 0, "confidence": "fairly-sure"}""", true))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25, "investing": 0.75}, "nextQuestionId": null, "done": true,
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
		String one = "{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"sure\"}";
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
				Arguments.of("unknown question", body(null, one.replace("sv-a", SENTINEL), true)),
				Arguments.of("repeated question", body(null, one + ", " + one, true)),
				Arguments.of("option past the last one", body(null, one.replace("\"optionIndex\": 0", "\"optionIndex\": 3"),
						true)),
				Arguments.of("negative option", body(null, one.replace("\"optionIndex\": 0", "\"optionIndex\": -1"),
						true)),
				Arguments.of("option without confidence", body(null, one.replace("\"sure\"", "null"), true)),
				Arguments.of("confidence without option", body(null, one.replace("\"optionIndex\": 0",
						"\"optionIndex\": null"), true)),
				Arguments.of("confidence outside its set", body(null, one.replace("\"sure\"", "\"" + SENTINEL + "\""),
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

	/** A contract-valid Jev step answer; {@code next} null leaves the next question out. */
	private static String jevStep(String mastery, String next, List<String> labels, double enough) {
		StringBuilder answers = new StringBuilder(mastery);
		if (next != null) {
			StringBuilder probabilities = new StringBuilder();
			for (String label : labels) {
				probabilities.append(probabilities.isEmpty() ? "" : ", ")
					.append("\"%s\": %s".formatted(label, label.equals(next) ? "0.7" : "0.05"));
			}
			answers.append((", \"next\": {\"type\": \"choice\", \"choice\": \"%s\", \"confidence\": 0.7,"
					+ " \"probabilities\": {%s}}").formatted(next, probabilities));
		}
		answers.append(", \"enough\": {\"type\": \"noul\", \"noul\": %s}".formatted(enough));
		return "{\"model\": \"jev-2026-05\", \"answers\": {" + answers + "}}";
	}

	private static final String MASTERY_BOTH = """
			"mastery_saving": {"type": "noul", "noul": 0.8}, "mastery_investing": {"type": "noul", "noul": 0.3}""";

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
	void jevRatesMasteryAndPicksTheNextQuestionFromTheSpecifiedRequest() throws Exception {
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(jevReplies(jevStep(MASTERY_BOTH, "sv-hard", UNASKED_AFTER_TWO, 0.2)));

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "investing": 0.3}, "nextQuestionId": "sv-hard", "done": false,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));

		assertEquals("jev-latest", sent.get().get("model").stringValue());
		assertEquals(json.readTree("""
				{"profile": {"ageBand": null, "savingsCover": "1-3", "horizon": "1-5y"}, "goals": ["start-saving"],
				 "answers": [
				   {"area": "saving", "result": "correct", "misconception": null, "confidence": "sure"},
				   {"area": "investing", "result": "wrong", "misconception": "Thinks 1 in-a", "confidence": "guessing"}]}"""),
				sent.get().get("state"));
		JsonNode spec = SpecBlocks.read(json, "jev-step-questions");
		ObjectNode expected = json.createObjectNode();
		expected.set("mastery_saving", spec.get("mastery_saving"));
		expected.set("mastery_investing", spec.get("mastery_investing"));
		ObjectNode next = (ObjectNode) spec.get("next").deepCopy();
		ObjectNode criteria = next.putObject("criteria");
		UNASKED_AFTER_TWO.forEach(id -> criteria.put(id, "Whether " + id));
		expected.set("next", next);
		expected.set("enough", spec.get("enough"));
		assertEquals(expected, sent.get().get("questions"));
	}

	@Test
	void withConsentTheFactsReachJev() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts.incomeBand").value("2-3.5k"))
			.andExpect(jsonPath("$.state.profile.horizon").value("1-5y"))
			.andRespond(jevReplies(jevStep("\"mastery_saving\": {\"type\": \"noul\", \"noul\": 0.9}", "in-a",
					List.of("in-a", "in-hard", "short-term-fall", "sv-b", "sv-hard"), 0.1)));

		step(VALID.replace("\"useRules\": true", "\"useRules\": false")).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.9, "investing": null}, "nextQuestionId": "in-a", "done": false,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	static Stream<Arguments> brokenSteps() {
		return Stream.of(
				Arguments.of("500", withServerError()),
				Arguments.of("read timeout", withException(new SocketTimeoutException())),
				Arguments.of("next outside the unasked ids",
						jevReplies(jevStep(MASTERY_BOTH, "sv-a", List.of("sv-a", "in-hard", "short-term-fall", "sv-b",
								"sv-hard"), 0.2))),
				Arguments.of("missing mastery", jevReplies(jevStep(MASTERY_BOTH.replace("mastery_investing", "other"),
						"sv-hard", UNASKED_AFTER_TWO, 0.2))),
				Arguments.of("probability above 1",
						jevReplies(jevStep(MASTERY_BOTH, "sv-hard", UNASKED_AFTER_TWO, 1.2))),
				Arguments.of("missing enough",
						jevReplies(jevStep(MASTERY_BOTH, "sv-hard", UNASKED_AFTER_TWO, 0.2).replace("enough", "other"))),
				Arguments.of("not JSON", withSuccess("not json", MediaType.APPLICATION_JSON)));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("brokenSteps")
	void aBrokenJevStepRunsOnTheRuleAndSwitchesToRules(String name, ResponseCreator response) throws Exception {
		jev.expect(requestTo(JEV_URL)).andRespond(response);

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.85, "investing": 0.25}, "nextQuestionId": "short-term-fall", "done": false,
					 "useRules": false, "stepFellBack": true}""", JsonCompareMode.STRICT));
	}

	@Test
	void jevSlowerThanThreeSecondsIsCutOffAndTheRuleTakesOver() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(after(Duration.ofMillis(3300), jevReplies(jevStep(MASTERY_BOTH, "sv-hard", UNASKED_AFTER_TWO,
					0.2))));

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"short-term-fall\", \"useRules\": false, \"stepFellBack\": true}",
					JsonCompareMode.LENIENT));
	}

	@Test
	void jevOverTheBudgetKeepsItsMasteryButTheRulePicksTheNextQuestion() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(after(Duration.ofMillis(1600), jevReplies(jevStep(MASTERY_BOTH, "sv-hard", UNASKED_AFTER_TWO,
					0.2))));

		step(TWO_ANSWERS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "investing": 0.3}, "nextQuestionId": "short-term-fall", "done": false,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void withOneUnaskedQuestionJevIsNotAskedForTheNextAndItComesNext() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.questions.next").doesNotExist())
			.andExpect(jsonPath("$.questions.enough").exists())
			.andRespond(jevReplies(jevStep(MASTERY_BOTH, null, List.of(), 0.2)));

		step(body("1-5y", String.join(", ", RIGHT_SV_A,
				"{\"questionId\": \"sv-b\", \"optionIndex\": 0, \"confidence\": \"sure\"}",
				"{\"questionId\": \"sv-hard\", \"optionIndex\": 2, \"confidence\": \"sure\"}", WRONG_IN_A,
				"{\"questionId\": \"in-hard\", \"optionIndex\": null, \"confidence\": null}"), false))
			.andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"short-term-fall\", \"done\": false}",
					JsonCompareMode.LENIENT));
	}

	@Test
	void aShortHorizonReplacesJevsSavingPickAndHidesTheShortTermFallFromJev() throws Exception {
		bank.question("fall-before-you-need-it", "berlin-3", "saving", "easy");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.questions.next.criteria.short-term-fall").doesNotExist())
			.andRespond(jevReplies(jevStep("\"mastery_saving\": {\"type\": \"noul\", \"noul\": 0.9}", "sv-b",
					List.of("fall-before-you-need-it", "in-a", "in-hard", "sv-b", "sv-hard"), 0.1)));

		step(body("within-1y", RIGHT_SV_A, false)).andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"fall-before-you-need-it\"}", JsonCompareMode.LENIENT));
	}

	@Test
	void enoughAfterThreeAnswersEndsTheTest() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(jevReplies(jevStep(MASTERY_BOTH, "sv-hard", List.of("in-hard", "short-term-fall", "sv-hard"),
					0.75)));

		step(body("1-5y", String.join(", ", RIGHT_SV_A, WRONG_IN_A,
				"{\"questionId\": \"sv-b\", \"optionIndex\": 0, \"confidence\": \"guessing\"}"), false))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "investing": 0.3}, "nextQuestionId": null, "done": true,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void afterAFallbackTheStepStaysOnTheRuleWithoutAskingJev() throws Exception {
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		step(TWO_ANSWERS.replace("\"useRules\": false", "\"useRules\": false, \"stepFellBack\": true")).andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.85, "investing": 0.25}, "nextQuestionId": "short-term-fall", "done": false,
					 "useRules": false, "stepFellBack": true}""", JsonCompareMode.STRICT));
	}

	@Test
	void anAnsweredAreaWithoutAMasteryQuestionTakesTheRuleMean() throws Exception {
		bank.question("db-a", "sao-paulo-1", "debt", "easy");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.questions.mastery_debt").doesNotExist())
			.andRespond(jevReplies(jevStep("\"mastery_saving\": {\"type\": \"noul\", \"noul\": 0.8}", "sv-b",
					List.of("in-a", "in-hard", "short-term-fall", "sv-b", "sv-hard"), 0.2)));

		step(body("1-5y", RIGHT_SV_A + ", {\"questionId\": \"db-a\", \"optionIndex\": 1, \"confidence\": \"guessing\"}",
				false))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "debt": 0.25, "investing": null}, "nextQuestionId": "sv-b", "done": false,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void overTheBudgetJevsEnoughStillEndsTheTest() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(after(Duration.ofMillis(1600), jevReplies(jevStep(MASTERY_BOTH, "sv-hard",
					List.of("in-hard", "short-term-fall", "sv-hard"), 0.75))));

		step(body("1-5y", String.join(", ", RIGHT_SV_A, WRONG_IN_A,
				"{\"questionId\": \"sv-b\", \"optionIndex\": 0, \"confidence\": \"guessing\"}"), false))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.8, "investing": 0.3}, "nextQuestionId": null, "done": true,
					 "useRules": false, "stepFellBack": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void sevenDistinctAnswersAre400() throws Exception {
		bank.question("sv-c", "berlin-5", "saving", "easy");
		StringBuilder seven = new StringBuilder();
		for (String id : List.of("sv-a", "sv-b", "sv-c", "sv-hard", "in-a", "in-hard", "short-term-fall")) {
			seven.append(seven.isEmpty() ? "" : ", ").append("{\"questionId\": \"%s\"}".formatted(id));
		}

		step(body(null, seven.toString(), true)).andExpect(status().isBadRequest());
		step(body(null, seven.substring(0, seven.lastIndexOf(", {")), true)).andExpect(status().isOk());
	}

}
