package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
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
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
@Transactional
class QuickCheckStepTests {

	private static final String SENTINEL = "zzsentinelzz";

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

	private String userId;

	@BeforeEach
	void ownBankAndUser() throws Exception {
		TestBank bank = new TestBank(jdbc);
		long emergency = bank.lesson("Emergency fund", "Rainy days.", 1);
		long compound = bank.lesson("Compound interest", "Time works.", 2);
		long inflation = bank.lesson("Inflation", "Prices rise.", 3);
		bank.question("sv-a", emergency, "saving", "easy");
		bank.question("sv-b", inflation, "saving", "easy");
		bank.question("sv-hard", emergency, "saving", "hard");
		bank.question("in-a", compound, "investing", "easy");
		bank.question("short-term-fall", compound, "investing", "easy");
		bank.question("in-hard", compound, "investing", "hard");
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
					 "useRules": false}""", JsonCompareMode.STRICT));
	}

	@Test
	void useRulesMakesNoJevRequestAndStaysOnRules() throws Exception {
		step(body(null, "{\"questionId\": \"sv-a\", \"optionIndex\": 1, \"confidence\": \"sure\"}", true))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25, "investing": null}, "nextQuestionId": "sv-b", "done": false,
					 "useRules": true}""", JsonCompareMode.STRICT));
	}

	@Test
	void aShortHorizonGetsTheShortTermFallOnTheRulePath() throws Exception {
		step(body("within-1y", "{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"sure\"}", true))
			.andExpect(status().isOk())
			.andExpect(content().json("{\"nextQuestionId\": \"short-term-fall\"}", JsonCompareMode.LENIENT));
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
					 "useRules": true}""", JsonCompareMode.STRICT));
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
				Arguments.of("more than six answers", body(null, String.join(", ", "{\"questionId\": \"sv-a\"}",
						"{\"questionId\": \"sv-b\"}", "{\"questionId\": \"sv-hard\"}", "{\"questionId\": \"in-a\"}",
						"{\"questionId\": \"in-hard\"}", "{\"questionId\": \"short-term-fall\"}",
						"{\"questionId\": \"x\"}"), true)),
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

}
