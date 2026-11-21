package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

import jakarta.persistence.EntityManager;

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
import org.springframework.test.web.client.match.MockRestRequestMatchers;
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
class QuickCheckCategorizationTests {

	private static final String SENTINEL = "zzsentinelzz";

	private static final String JEV_URL = "https://api.typesafe.ai/v1/systemone";

	private static final String ONBOARDING = """
			{"lifeStage": "building", "goals": ["start-saving"], "experience": "occasional", "skipped": false}""";

	private static final String PROFILE = "{\"ageBand\": null, \"savingsCover\": \"1-3\", \"horizon\": \"1-5y\"}";

	// Saving: guessed right, sure but wrong. Investing: fairly sure and right, then Not sure.
	private static final String HISTORY = """
			[{"questionId": "sv-a", "optionIndex": 0, "confidence": "guessing"},
			 {"questionId": "sv-b", "optionIndex": 1, "confidence": "sure"},
			 {"questionId": "in-a", "optionIndex": 0, "confidence": "fairly-sure"},
			 {"questionId": "in-hard", "optionIndex": null, "confidence": null}]""";

	private static final String QUICK_CHECK = """
			{"consent": false, "profile": %s, "history": %s, "mastery": {"saving": 0.425, "investing": 0.5},
			 "useRules": false, "stepCallsMade": 3}""".formatted(PROFILE, HISTORY);

	private static final String FACTS = """
			{"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true,
			 "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}""";

	private static final String NO_QUICK_CHECK = "{\"consent\": false}";

	private static final String F1_ANSWERS = """
			"role": {"type": "choice", "choice": "intermediate", "confidence": 0.8,
			         "probabilities": {"novice": 0.1, "intermediate": 0.8, "advanced": 0.1}},
			"focus_saving": {"type": "noul", "noul": 0.2}, "focus_debt": {"type": "noul", "noul": 0.7},
			"focus_investing": {"type": "noul", "noul": 0.9}, "focus_risk": {"type": "noul", "noul": 0.6},
			"focus_retirement": {"type": "noul", "noul": 0.1}""";

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	JsonMapper json;

	@Autowired
	EntityManager entityManager;

	@Autowired
	Clock clock;

	private String userId;

	private TestBank bank;

	private long emergency;

	private long compound;

	private long inflation;

	@BeforeEach
	void ownBankAndUser() throws Exception {
		bank = new TestBank(jdbc);
		emergency = bank.lesson("Emergency fund", "Rainy days.", 1);
		compound = bank.lesson("Compound interest", "Time works.", 2);
		inflation = bank.lesson("Inflation", "Prices rise.", 3);
		bank.question("sv-a", emergency, "saving", "easy");
		bank.question("sv-b", inflation, "saving", "easy");
		bank.question("sv-hard", emergency, "saving", "hard");
		bank.question("in-a", compound, "investing", "easy");
		bank.question("short-term-fall", compound, "investing", "easy");
		bank.question("in-hard", compound, "investing", "hard");
		userId = "final-" + UUID.randomUUID();
		onboard(ONBOARDING);
	}

	@AfterEach
	void verifyJev() {
		jev.verify();
	}

	private void onboard(String answers) throws Exception {
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content(answers)).andExpect(status().isOk());
		// The profile is a JPA write in the test's transaction; the JDBC inserts below need it in the table.
		entityManager.flush();
	}

	private ResultActions categorize(String body) throws Exception {
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	private void complete(long lessonId) {
		jdbc.sql("INSERT INTO lesson_completion (user_id, lesson_id, completed_on, xp) VALUES (?, ?, ?, 10)")
			.params(userId, lessonId, LocalDate.now(clock))
			.update();
	}

	private ResultActions stored() throws Exception {
		return mvc.perform(get("/api/users/{id}/categorization", userId));
	}

	private static String onRules(String body) {
		return body.replace("\"useRules\": false", "\"useRules\": true");
	}

	private static String choice(String key, String chosen, String... labels) {
		StringBuilder probabilities = new StringBuilder();
		for (String label : labels) {
			probabilities.append(probabilities.isEmpty() ? "" : ", ")
				.append("\"%s\": %s".formatted(label, label.equals(chosen) ? "0.8" : "0.1"));
		}
		return ", \"%s\": {\"type\": \"choice\", \"choice\": \"%s\", \"confidence\": 0.8, \"probabilities\": {%s}}"
			.formatted(key, chosen, probabilities);
	}

	private static String jevFinal(String extra) {
		return "{\"model\": \"jev-2026-05\", \"answers\": {" + F1_ANSWERS + extra + "}}";
	}

	private String lessons(long first, long second, long third) {
		return choice("first_lesson", "lesson_" + first, "lesson_" + first, "lesson_" + second, "lesson_" + third);
	}

	@Test
	void theFinalCallIsF1PlusTheSpecifiedQuestionsAndItsLabelsPickTheLessonAndGaps() throws Exception {
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "over", "under", "over", "aligned")
					+ choice("gap_investing", "under", "under", "over", "aligned")
					+ lessons(emergency, inflation, compound)), MediaType.APPLICATION_JSON));

		// The rule would start at inflation (sv-b, the weakest area's lowest score); Jev's emergency wins.
		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(content().json("""
					{"source": "jev", "role": "intermediate", "profile": %s,
					 "mastery": {"saving": 0.425, "investing": 0.5}, "answerCount": 4,
					 "confidenceGaps": [
					   {"area": "investing", "direction": "under",
					    "because": "On Investing you said “Fairly sure”, yet your answers show you already understand how it works."},
					   {"area": "saving", "direction": "over",
					    "because": "On Saving you said “Sure”. Your answers leave a few things open, which is where your first lesson starts."}],
					 "startLesson": {"lessonId": %d, "title": "Emergency fund", "area": "saving"}, "readyForNext": false,
					 "pathLessonIds": [%d, %d, %d],
					 "startHere": {"lessonId": %d, "title": "Emergency fund", "area": "saving"},
					 "sharedWithModel": {"facts": null, "answers": %s, "profile": %s, "answerCount": 4, "stepCallsMade": 3}}"""
				.formatted(PROFILE, emergency, emergency, inflation, compound, emergency, ONBOARDING, PROFILE),
					JsonCompareMode.LENIENT));

		assertEquals(json.readTree("""
				{"answers": %s, "profile": %s, "goals": ["start-saving"], "checkAnswers": [
				  {"area": "saving", "result": "correct", "misconception": null, "confidence": "guessing"},
				  {"area": "saving", "result": "wrong", "misconception": "Thinks 1 sv-b", "confidence": "sure"},
				  {"area": "investing", "result": "correct", "misconception": null, "confidence": "fairly-sure"},
				  {"area": "investing", "result": "not-sure", "misconception": null, "confidence": null}]}"""
			.formatted(ONBOARDING, PROFILE)), sent.get().get("state"));
		JsonNode block = SpecBlocks.read(json, "jev-final-questions");
		ObjectNode expected = (ObjectNode) SpecBlocks.read(json, SpecBlocks.F1, "jev-questions").deepCopy();
		expected.set("gap_saving", block.get("gap_<area>"));
		expected.set("gap_investing", block.get("gap_<area>"));
		ObjectNode firstLesson = (ObjectNode) block.get("first_lesson").deepCopy();
		firstLesson.putObject("criteria")
			.put("lesson_" + emergency, "Rainy days.")
			.put("lesson_" + inflation, "Prices rise.")
			.put("lesson_" + compound, "Time works.");
		expected.set("first_lesson", firstLesson);
		assertEquals(expected, sent.get().get("questions"));
	}

	@Test
	void aJevGapLabelWhoseChipsDoNotBackItUpReadsAsAligned() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "under", "under", "over", "aligned")
					+ choice("gap_investing", "over", "under", "over", "aligned")
					+ lessons(emergency, inflation, compound)), MediaType.APPLICATION_JSON));
		// Sure and right on saving, fairly sure and right on investing: neither label has its precondition.
		String history = """
				[{"questionId": "sv-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "in-a", "optionIndex": 0, "confidence": "fairly-sure"}]""";

		categorize(QUICK_CHECK.replace(HISTORY, history)).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.confidenceGaps").isEmpty());
	}

	@Test
	void aBrokenGapAnswerPutsTheWholeCategorisationOnRules() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "over", "under", "over", "aligned")
					+ lessons(inflation, emergency, compound)), MediaType.APPLICATION_JSON));

		// The rule: saving has a wrong Sure answer (over); investing's right fairly-sure answer at 0.5 is under.
		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.confidenceGaps[0].area").value("investing"))
			.andExpect(jsonPath("$.confidenceGaps[0].direction").value("under"))
			.andExpect(jsonPath("$.confidenceGaps[1].area").value("saving"))
			.andExpect(jsonPath("$.confidenceGaps[1].direction").value("over"))
			.andExpect(jsonPath("$.startLesson.lessonId").value(inflation))
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(3));
	}

	@Test
	void useRulesMakesNoFinalCallAndSharedWithModelStillCountsTheSteps() throws Exception {
		categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(3))
			.andExpect(jsonPath("$.sharedWithModel.answers").isEmpty());

		categorize(onRules(QUICK_CHECK).replace("\"stepCallsMade\": 3", "\"stepCallsMade\": 0"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.sharedWithModel").isEmpty());
	}

	@Test
	void theStoredRowKeepsConfidenceAndTheCountButNoAnswer() throws Exception {
		String history = """
				[{"questionId": "sv-a", "optionIndex": 1, "confidence": "guessing"},
				 {"questionId": "sv-b", "optionIndex": null, "confidence": null},
				 {"questionId": "in-a", "optionIndex": 0, "confidence": "fairly-sure"}]""";

		categorize(onRules(QUICK_CHECK.replace(HISTORY, history))).andExpect(status().isOk());

		String data = jdbc.sql("SELECT data::text FROM categorization WHERE user_id = ?")
			.param(userId)
			.query(String.class)
			.single();
		JsonNode row = json.readTree(data);
		assertEquals(json.readTree("{\"saving\": 0.25, \"investing\": 0.6}"), row.get("confidence"));
		assertEquals(3, row.get("answerCount").intValue());
		assertFalse(row.has("startHere"));
		for (String leak : new String[] { "sv-a", "sv-b", "in-a", "questionId", "optionIndex", "history" }) {
			assertFalse(data.contains(leak), leak);
		}
	}

	@Test
	void withLifeStageSkippedTheAgeBandGivesItOnlyAtTheEnds() throws Exception {
		onboard("{\"goals\": [\"start-saving\"], \"experience\": \"occasional\", \"skipped\": false}");

		categorize(onRules(QUICK_CHECK.replace("\"ageBand\": null", "\"ageBand\": \"60+\"")))
			.andExpect(jsonPath("$.lifeStage").value("pre-retirement"))
			.andExpect(jsonPath("$.lessonVariant.persona").value("pre-retirement"));
		categorize(onRules(QUICK_CHECK.replace("\"ageBand\": null", "\"ageBand\": \"18-25\"")))
			.andExpect(jsonPath("$.lifeStage").value("student"));
		categorize(onRules(QUICK_CHECK.replace("\"ageBand\": null", "\"ageBand\": \"26-40\"")))
			.andExpect(jsonPath("$.lifeStage").isEmpty());
	}

	@Test
	void aLifeStageFromOnboardingWinsOverTheAgeBand() throws Exception {
		categorize(onRules(QUICK_CHECK.replace("\"ageBand\": null", "\"ageBand\": \"18-25\"")))
			.andExpect(jsonPath("$.lifeStage").value("family"));
	}

	@Test
	void startHereMovesOnAfterACompletionAndSkipsADeletedLesson() throws Exception {
		String path = categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		assertEquals(json.readTree("[%d, %d, %d]".formatted(inflation, emergency, compound)),
				json.readTree(path).get("pathLessonIds"));
		stored().andExpect(jsonPath("$.startHere.lessonId").value(inflation));

		complete(inflation);
		stored().andExpect(content().json("""
				{"startHere": {"lessonId": %d, "title": "Emergency fund", "area": "saving"}}""".formatted(emergency),
				JsonCompareMode.LENIENT));

		jdbc.sql("DELETE FROM lesson WHERE id = ?").param(emergency).update();
		stored().andExpect(jsonPath("$.startHere.lessonId").value(compound));
	}

	@Test
	void aLessonCompletedBeforeTheTestIsNotOnThePath() throws Exception {
		complete(inflation);

		categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andExpect(jsonPath("$.startLesson.lessonId").value(emergency))
			.andExpect(jsonPath("$.pathLessonIds.length()").value(2));
	}

	@Test
	void aPostWithAHistoryAsksJevAgainInsteadOfReusingTheLastResult() throws Exception {
		String body = QUICK_CHECK.replace(HISTORY, "[{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"sure\"}]");
		for (int i = 0; i < 2; i++) {
			jev.expect(requestTo(JEV_URL))
				.andRespond(withSuccess(jevFinal(choice("gap_saving", "aligned", "under", "over", "aligned")
						+ choice("first_lesson", "lesson_" + emergency, "lesson_" + emergency, "lesson_" + inflation)),
						MediaType.APPLICATION_JSON));
		}

		categorize(body).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("jev"));
		categorize(body).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("jev"));
	}

	@Test
	void aRowFromBeforeTheQuickCheckReadsWithDefaults() throws Exception {
		jdbc.sql("INSERT INTO categorization (user_id, data) VALUES (?, ?::jsonb)")
			.params(userId, """
					{"userId": "%s", "consent": false, "bankData": false, "role": "novice", "lifeStage": null,
					 "focusAreas": ["saving"], "confidenceGaps": [], "checks": [],
					 "lessonVariant": {"persona": null, "level": "beginner", "lang": "plain"}, "explanation": [],
					 "startLesson": {"lessonId": 1, "title": "Emergency fund"},
					 "sharedWithModel": null, "source": "fallback", "model": null,
					 "categorizedAt": "%s"}""".formatted(userId, Instant.now(clock)))
			.update();

		stored().andExpect(status().isOk())
			.andExpect(content().json("""
					{"profile": null, "mastery": {}, "confidence": {}, "answerCount": 0, "readyForNext": false,
					 "pathLessonIds": [], "startHere": null}""", JsonCompareMode.LENIENT));
	}

	private JsonNode categorized(String body) throws Exception {
		return json.readTree(categorize(body).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
	}

	@Test
	void anAnsweredAreaWithoutAMasteryValueIsStoredWithTheRuleMean() throws Exception {
		categorize(onRules(QUICK_CHECK.replace("\"investing\": 0.5", "\"investing\": null"))).andExpect(status().isOk());
		stored().andExpect(content().json("{\"mastery\": {\"saving\": 0.425, \"investing\": 0.5}}",
				JsonCompareMode.LENIENT));

		categorize(onRules(QUICK_CHECK.replace(HISTORY, "[{\"questionId\": \"sv-a\", \"optionIndex\": 1, \"confidence\": \"sure\"}]")
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{}")))
			.andExpect(status().isOk());
		stored().andExpect(content().json("{\"mastery\": {\"saving\": 0.25, \"investing\": null}}",
				JsonCompareMode.LENIENT));
	}

	@Test
	void stepCallsMadeOutsideItsRangeIsClamped() throws Exception {
		categorize(onRules(QUICK_CHECK).replace("\"stepCallsMade\": 3", "\"stepCallsMade\": 9")).andExpect(status().isOk())
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(6));
		categorize(onRules(QUICK_CHECK).replace("\"stepCallsMade\": 3", "\"stepCallsMade\": -1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.sharedWithModel").isEmpty());
	}

	@Test
	void useRulesWithoutTheQuickCheckMakesNoJevCall() throws Exception {
		jev.expect(ExpectedCount.never(), requestTo(JEV_URL));

		categorize("{\"consent\": false, \"useRules\": true}").andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.sharedWithModel").isEmpty());
	}

	@Test
	void useRulesSkipsTheReuseOfARecentJevResult() throws Exception {
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(jevFinal(""), MediaType.APPLICATION_JSON));

		categorize(NO_QUICK_CHECK).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("jev"));
		categorize("{\"consent\": false, \"useRules\": true}").andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"));
	}

	@Test
	void theRangesWithoutAnAnswerAreTheSkipPath() throws Exception {
		categorize(onRules(QUICK_CHECK.replace(HISTORY, "[]"))).andExpect(status().isOk())
			.andExpect(content().json("""
					{"profile": null, "mastery": {}, "confidence": {}, "answerCount": 0}""", JsonCompareMode.LENIENT));
	}

	@Test
	void withoutTheRangesTheHistoryIsNotCheckedAgainstTheBank() throws Exception {
		categorize(onRules("""
				{"consent": false, "history": [{"questionId": "gone-from-the-bank", "optionIndex": 7, "confidence": "sure"}],
				 "mastery": {"debt": 0.5}, "useRules": true}"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.answerCount").value(0));
	}

	@Test
	void withoutTheQuickCheckTheFirstLessonFollowsTheJudgedFocus() throws Exception {
		// Goals put saving first; Jev's focus puts investing ahead of it.
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(jevFinal(""), MediaType.APPLICATION_JSON));

		categorize(NO_QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.startLesson.lessonId").value(compound))
			.andExpect(jsonPath("$.pathLessonIds[0]").value(compound));
	}

	@Test
	void oneCandidateIsTheFirstLessonWithoutAskingJev() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(MockRestRequestMatchers.jsonPath("$.questions.first_lesson")
				.doesNotExist())
			.andRespond(withSuccess(jevFinal(choice("gap_investing", "aligned", "under", "over", "aligned")),
					MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK.replace(HISTORY, "[{\"questionId\": \"in-a\", \"optionIndex\": 0, \"confidence\": \"sure\"}]")
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": null, \"investing\": 0.85}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.startLesson.lessonId").value(compound));
	}

	@Test
	void withConsentTheFactsReachJevButTheGapsComeFromTheChipsOnly() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(MockRestRequestMatchers.jsonPath("$.state.facts.incomeBand")
				.value("2-3.5k"))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "aligned", "under", "over", "aligned")
					+ choice("gap_investing", "aligned", "under", "over", "aligned")
					+ lessons(inflation, emergency, compound)), MediaType.APPLICATION_JSON));

		// F1's facts table would give two "under" cards for this onboarding and these facts.
		categorize(QUICK_CHECK.replace("\"consent\": false", "\"consent\": true, \"facts\": " + FACTS)
			.replace("\"savingsCover\": \"1-3\"", "\"savingsCover\": null"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.bankData").value(true))
			.andExpect(jsonPath("$.confidenceGaps").isEmpty());
	}

	@Test
	void theSavingsCoverAndTheAgeBandFeedTheRuleFocus() throws Exception {
		onboard("{\"goals\": [\"stocks-etfs\"], \"experience\": \"planning\", \"skipped\": false}");

		assertEquals(json.readTree("[\"saving\", \"investing\"]"),
				categorized(onRules(QUICK_CHECK.replace("\"1-3\"", "\"<1\""))).get("focusAreas"));
		assertEquals(json.readTree("[\"investing\"]"),
				categorized(onRules(QUICK_CHECK.replace("\"1-3\"", "\"6+\""))).get("focusAreas"));
		JsonNode olderUser = categorized(onRules(QUICK_CHECK.replace("\"1-3\"", "\"6+\"")
			.replace("\"ageBand\": null", "\"ageBand\": \"60+\"")));
		assertEquals(json.readTree("[\"retirement\", \"investing\"]"), olderUser.get("focusAreas"));
	}

	@Test
	void everyAreaSolidIsReadyForNextAndStartHereEndsWhenItIsDone() throws Exception {
		String history = """
				[{"questionId": "sv-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "sv-b", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "in-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "short-term-fall", "optionIndex": 0, "confidence": "sure"}]""";

		categorize(onRules(QUICK_CHECK.replace(HISTORY, history)
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": 0.9, \"investing\": 0.9}")))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"readyForNext": true, "startLesson": {"lessonId": %1$d}, "pathLessonIds": [%1$d],
					 "startHere": {"lessonId": %1$d}}""".formatted(inflation), JsonCompareMode.LENIENT));

		complete(inflation);
		stored().andExpect(status().isOk()).andExpect(jsonPath("$.startHere").isEmpty());
	}

	@Test
	void sevenDistinctAnswersAre400() throws Exception {
		bank.question("sv-c", inflation, "saving", "easy");
		StringBuilder seven = new StringBuilder();
		for (String id : List.of("sv-a", "sv-b", "sv-c", "sv-hard", "in-a", "in-hard", "short-term-fall")) {
			seven.append(seven.isEmpty() ? "" : ", ").append("{\"questionId\": \"%s\"}".formatted(id));
		}

		categorize(onRules(QUICK_CHECK.replace(HISTORY, "[" + seven + "]"))).andExpect(status().isBadRequest());
		categorize(onRules(QUICK_CHECK.replace(HISTORY, "[" + seven.substring(0, seven.lastIndexOf(", {")) + "]")))
			.andExpect(status().isOk());
	}

	static Stream<Arguments> badFinals() {
		return Stream.of(
				Arguments.of("mastery for an area without questions",
						QUICK_CHECK.replace("\"investing\": 0.5", "\"debt\": 0.5")),
				Arguments.of("mastery for an unknown area",
						QUICK_CHECK.replace("\"investing\": 0.5", "\"" + SENTINEL + "\": 0.5")),
				Arguments.of("mastery above 1", QUICK_CHECK.replace("0.425", "1.2")),
				Arguments.of("mastery below 0", QUICK_CHECK.replace("0.425", "-0.1")),
				Arguments.of("unknown question", QUICK_CHECK.replace("\"in-hard\"", "\"" + SENTINEL + "\"")),
				Arguments.of("repeated question", QUICK_CHECK.replace("\"in-hard\"", "\"sv-a\"")),
				Arguments.of("option past the last one", QUICK_CHECK.replace("\"optionIndex\": 1", "\"optionIndex\": 3")),
				Arguments.of("option without confidence", QUICK_CHECK.replace("\"guessing\"", "null")),
				Arguments.of("confidence without option",
						QUICK_CHECK.replace("\"optionIndex\": null, \"confidence\": null",
								"\"optionIndex\": null, \"confidence\": \"sure\"")),
				Arguments.of("confidence outside its set", QUICK_CHECK.replace("\"guessing\"", "\"" + SENTINEL + "\"")),
				Arguments.of("profile value outside its set", QUICK_CHECK.replace("\"1-5y\"", "\"" + SENTINEL + "\"")),
				Arguments.of("savings cover with consent", QUICK_CHECK.replace("\"consent\": false", "\"consent\": true")));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("badFinals")
	void aBadFinalPostIs400WithoutEchoingTheValueOrStoringAnything(String name, String body) throws Exception {
		String response = categorize(body).andExpect(status().isBadRequest())
			.andReturn()
			.getResponse()
			.getContentAsString();

		assertFalse(response.contains(SENTINEL), response);
		stored().andExpect(status().isNotFound());
	}

}
