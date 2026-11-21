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
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restclient.test.autoconfigure.AutoConfigureMockRestServiceServer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.match.MockRestRequestMatchers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.categorization.repositories.CategorizationRepository;
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;
import com.collabothon.back.lesson.LessonCompletionRepository;
import com.collabothon.back.lesson.LessonContent;

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
	LessonCompletionRepository completions;

	@Autowired
	CheckQuestionRepository questions;

	@Autowired
	CategorizationRepository categorizations;

	@Autowired
	JsonMapper json;

	@Autowired
	Clock clock;

	@Autowired
	LessonContent lessonContent;

	private String userId;

	private TestBank bank;

	@BeforeEach
	void ownBankAndUser() throws Exception {
		// One story per lesson, so the path has three stories to order.
		bank = new TestBank(questions);
		bank.question("sv-a", "berlin-1", "saving", "easy");
		bank.question("sv-b", "sao-paulo-1", "saving", "easy");
		bank.question("sv-hard", "berlin-1", "saving", "hard");
		bank.question("in-a", "tokyo-1", "investing", "easy");
		bank.question("short-term-fall", "tokyo-1", "investing", "easy");
		bank.question("in-hard", "tokyo-1", "investing", "hard");
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
	}

	private ResultActions categorize(String body) throws Exception {
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	private void complete(String... lessonIds) {
		for (String lessonId : lessonIds) {
			completions.insertFirst(userId, lessonId, 10);
		}
	}

	private void completeStory(String storyId) {
		complete(lessonContent.lessonIdsOf(story(storyId)).toArray(String[]::new));
	}

	private JsonNode story(String storyId) {
		return lessonContent.stories().stream().filter(s -> s.path("id").asString().equals(storyId)).findFirst()
			.orElseThrow();
	}

	private String title(String lessonId) {
		return lessonContent.lesson(lessonId).orElseThrow().path("title").asString();
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

	private static String stories(String first, String second, String third) {
		return choice("first_lesson", "story_" + first, "story_" + first, "story_" + second, "story_" + third);
	}

	@Test
	void theFinalCallIsF1PlusTheSpecifiedQuestionsAndItsLabelsPickTheLessonAndGaps() throws Exception {
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "over", "under", "over", "aligned")
					+ choice("gap_investing", "under", "under", "over", "aligned")
					+ stories("berlin", "sao-paulo", "tokyo")), MediaType.APPLICATION_JSON));

		// The rule would start in São Paulo (sv-b, the weakest area's lowest score); Jev's Berlin wins.
		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(content().json("""
					{"source": "jev", "role": "intermediate", "profile": %s,
					 "mastery": {"saving": 0.425, "investing": 0.5}, "answerCount": 4,
					 "confidenceGaps": [
					   {"area": "investing", "direction": "under",
					    "because": "On Investing you said “Fairly sure”, yet your answers show you already understand how it works."},
					   {"area": "saving", "direction": "over",
					    "because": "On Saving you said “Sure”. Your answers leave a few things open, which is where your first lesson starts."}],
					 "startLesson": {"lessonId": "berlin-1", "title": "%2$s", "area": "saving", "storyId": "berlin",
					                 "storyCity": "Berlin"},
					 "readyForNext": false, "pathStoryIds": ["berlin", "sao-paulo", "tokyo"],
					 "startHere": {"lessonId": "berlin-1", "title": "%2$s", "area": "saving", "storyId": "berlin",
					               "storyCity": "Berlin"},
					 "sharedWithModel": {"facts": null, "answers": %3$s, "profile": %1$s, "answerCount": 4, "stepCallsMade": 3}}"""
				.formatted(PROFILE, title("berlin-1"), ONBOARDING),
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
		ObjectNode criteria = firstLesson.putObject("criteria");
		for (String storyId : List.of("berlin", "sao-paulo", "tokyo")) {
			criteria.put("story_" + storyId, story(storyId).path("topic").asString());
		}
		expected.set("first_lesson", firstLesson);
		assertEquals(expected, sent.get().get("questions"));
	}

	@Test
	void aJevGapLabelWhoseChipsDoNotBackItUpReadsAsAligned() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "under", "under", "over", "aligned")
					+ choice("gap_investing", "over", "under", "over", "aligned")
					+ stories("berlin", "sao-paulo", "tokyo")), MediaType.APPLICATION_JSON));
		// Sure and right on saving, fairly sure and right on investing: neither label has its precondition.
		String history = """
				[{"questionId": "sv-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "in-a", "optionIndex": 0, "confidence": "fairly-sure"}]""";

		categorize(QUICK_CHECK.replace(HISTORY, history)).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.confidenceGaps").isEmpty());
	}

	@ParameterizedTest(name = "saving mastery {0} -> {1} gap cards")
	@CsvSource({ "0.25, 0", "0.4, 1" })
	void jevsUnderNeedsTheAreaAtLeastBuildingLikeTheRule(String saving, int cards) throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "under", "under", "over", "aligned")
					+ choice("first_lesson", "story_berlin", "story_berlin", "story_sao-paulo")), MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK.replace(HISTORY, "[{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"guessing\"}]")
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": %s, \"investing\": null}".formatted(saving)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.confidenceGaps.length()").value(cards));
	}

	@Test
	void aBrokenGapAnswerPutsTheWholeCategorisationOnRules() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "over", "under", "over", "aligned")
					+ stories("sao-paulo", "berlin", "tokyo")), MediaType.APPLICATION_JSON));

		// The rule: saving has a wrong Sure answer (over); investing's right fairly-sure answer at 0.5 is under.
		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.confidenceGaps[0].area").value("investing"))
			.andExpect(jsonPath("$.confidenceGaps[0].direction").value("under"))
			.andExpect(jsonPath("$.confidenceGaps[1].area").value("saving"))
			.andExpect(jsonPath("$.confidenceGaps[1].direction").value("over"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("sao-paulo-1"))
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(3));
	}

	@Test
	void useRulesMakesNoFinalCallAndSharedWithModelStillCountsTheSteps() throws Exception {
		categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(3))
			.andExpect(jsonPath("$.sharedWithModel.answers").isEmpty())
			.andExpect(jsonPath("$.sharedWithModel.goals[0]").value("start-saving"));

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

		String data = categorizations.findData(userId).orElseThrow();
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
	void startHereMovesThroughTheStoryThenToTheNextStoryAndSkipsAStoryThatIsGone() throws Exception {
		String path = categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		assertEquals(json.readTree("[\"sao-paulo\", \"berlin\", \"tokyo\"]"), json.readTree(path).get("pathStoryIds"));
		stored().andExpect(jsonPath("$.startHere.lessonId").value("sao-paulo-1"));

		// sao-paulo-2 has no bank questions, so it takes the area of the story's first bank lesson.
		complete("sao-paulo-1");
		stored().andExpect(content().json("""
				{"startHere": {"lessonId": "sao-paulo-2", "title": "%s", "area": "saving", "storyId": "sao-paulo",
				               "storyCity": "São Paulo"}}""".formatted(title("sao-paulo-2")), JsonCompareMode.LENIENT));

		completeStory("sao-paulo");
		stored().andExpect(jsonPath("$.startHere.lessonId").value("berlin-1"));

		ObjectNode data = (ObjectNode) json.readTree(categorizations.findData(userId).orElseThrow());
		data.set("pathStoryIds", json.readTree("[\"gone\", \"tokyo\"]"));
		categorizations.saveIfOnboarded(userId, json.writeValueAsString(data));
		stored().andExpect(jsonPath("$.startHere.storyId").value("tokyo"));
	}

	@Test
	void aStoryWithEveryLessonDoneIsNotOnThePathAndTheStartLessonIsTheFirstNotDone() throws Exception {
		completeStory("sao-paulo");
		complete("berlin-1");

		categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-2"))
			.andExpect(jsonPath("$.startLesson.storyId").value("berlin"))
			.andExpect(jsonPath("$.pathStoryIds.length()").value(2));
	}

	@Test
	void theAreaIsTheOneThatPickedTheStoryNotTheStartLessonsOwn() throws Exception {
		bank.question("in-berlin", "berlin-2", "investing", "easy");
		String history = """
				[{"questionId": "sv-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "in-berlin", "optionIndex": 1, "confidence": "sure"}]""";

		// Investing (0.25) is weakest and its answer sits in Berlin; Berlin's next stop berlin-1 is a saving lesson.
		categorize(onRules(QUICK_CHECK.replace(HISTORY, history)
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": 0.85, \"investing\": 0.25}")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-1"))
			.andExpect(jsonPath("$.startLesson.area").value("investing"))
			.andExpect(jsonPath("$.startHere.area").value("investing"));
		stored().andExpect(jsonPath("$.startHere.area").value("investing"));
	}

	@Test
	void aPostWithAHistoryAsksJevAgainInsteadOfReusingTheLastResult() throws Exception {
		String body = QUICK_CHECK.replace(HISTORY, "[{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"sure\"}]");
		for (int i = 0; i < 2; i++) {
			jev.expect(requestTo(JEV_URL))
				.andRespond(withSuccess(jevFinal(choice("gap_saving", "aligned", "under", "over", "aligned")
						+ choice("first_lesson", "story_berlin", "story_berlin", "story_sao-paulo")),
						MediaType.APPLICATION_JSON));
		}

		categorize(body).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("jev"));
		categorize(body).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("jev"));
	}

	@Test
	void aRowFromBeforeTheQuickCheckReadsWithDefaults() throws Exception {
		categorizations.saveIfOnboarded(userId, """
					{"userId": "%s", "consent": false, "bankData": false, "role": "novice", "lifeStage": null,
					 "focusAreas": ["saving"], "confidenceGaps": [], "checks": [],
					 "lessonVariant": {"persona": null, "level": "beginner", "lang": "plain"}, "explanation": [],
					 "startLesson": {"lessonId": 1, "title": "Emergency fund"}, "pathLessonIds": [1],
					 "sharedWithModel": null, "source": "fallback", "model": null,
					 "categorizedAt": "%s"}""".formatted(userId, Instant.now(clock)));

		stored().andExpect(status().isOk())
			.andExpect(content().json("""
					{"profile": null, "mastery": {}, "confidence": {}, "answerCount": 0, "readyForNext": false,
					 "pathStoryIds": [], "startHere": null}""", JsonCompareMode.LENIENT));
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
	void stepCallsMadeAboveSixIsStoredAsSent() throws Exception {
		categorize(onRules(QUICK_CHECK).replace("\"stepCallsMade\": 3", "\"stepCallsMade\": 9")).andExpect(status().isOk())
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(9));
	}

	@Test
	void anF1ResendAfterStepCallsStillDisclosesThem() throws Exception {
		categorize("{\"consent\": false, \"useRules\": true, \"stepCallsMade\": 2}").andExpect(status().isOk())
			.andExpect(content().json("""
					{"sharedWithModel": {"facts": null, "answers": null, "goals": ["start-saving"], "profile": null,
					 "answerCount": 0, "stepCallsMade": 2}}""", JsonCompareMode.LENIENT));
	}

	@Test
	void aRequestWithoutTheQuickCheckDoesNotReuseAQuickCheckResult() throws Exception {
		for (int i = 0; i < 2; i++) {
			jev.expect(requestTo(JEV_URL))
				.andRespond(withSuccess(jevFinal(choice("gap_saving", "over", "under", "over", "aligned")
						+ choice("gap_investing", "under", "under", "over", "aligned")
						+ stories("berlin", "sao-paulo", "tokyo")), MediaType.APPLICATION_JSON));
		}

		categorize(QUICK_CHECK).andExpect(status().isOk()).andExpect(jsonPath("$.answerCount").value(4));
		categorize(NO_QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.answerCount").value(0))
			.andExpect(jsonPath("$.profile").isEmpty());
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
			.andExpect(jsonPath("$.startLesson.lessonId").value("tokyo-1"))
			.andExpect(jsonPath("$.pathStoryIds[0]").value("tokyo"));
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
			.andExpect(jsonPath("$.startLesson.lessonId").value("tokyo-1"));
	}

	@Test
	void withConsentTheFactsReachJevButTheGapsComeFromTheChipsOnly() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(MockRestRequestMatchers.jsonPath("$.state.facts.incomeBand")
				.value("2-3.5k"))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "aligned", "under", "over", "aligned")
					+ choice("gap_investing", "aligned", "under", "over", "aligned")
					+ stories("sao-paulo", "berlin", "tokyo")), MediaType.APPLICATION_JSON));

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
	void everyAreaSolidStartsTheFirstStoryWithALessonLeftAndStartHereEndsWhenItIsDone() throws Exception {
		String history = """
				[{"questionId": "sv-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "sv-b", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "in-a", "optionIndex": 0, "confidence": "sure"},
				 {"questionId": "short-term-fall", "optionIndex": 0, "confidence": "sure"}]""";

		categorize(onRules(QUICK_CHECK.replace(HISTORY, history)
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": 0.9, \"investing\": 0.9}")))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"readyForNext": true, "startLesson": {"lessonId": "seoul-1", "storyId": "seoul"},
					 "pathStoryIds": ["seoul"], "startHere": {"lessonId": "seoul-1"}}""", JsonCompareMode.LENIENT));

		completeStory("seoul");
		stored().andExpect(status().isOk()).andExpect(jsonPath("$.startHere").isEmpty());
	}

	@ParameterizedTest(name = "Jev {0}, saving mastery {1} -> {2}")
	@CsvSource({ "advanced, 0.39, novice", "intermediate, 0.39, novice", "advanced, 0.4, advanced",
			"intermediate, 0.4, intermediate" })
	void withoutAnAreaAtLeastBuildingTheRoleIsNovice(String jevRole, String saving, String role) throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(choice("gap_saving", "aligned", "under", "over", "aligned")
					+ choice("first_lesson", "story_berlin", "story_berlin", "story_sao-paulo"))
				.replace("""
						"role": {"type": "choice", "choice": "intermediate", "confidence": 0.8,
						         "probabilities": {"novice": 0.1, "intermediate": 0.8, "advanced": 0.1}}""",
						choice("role", jevRole, "novice", "intermediate", "advanced").substring(2)),
					MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK.replace(HISTORY, "[{\"questionId\": \"sv-a\", \"optionIndex\": 0, \"confidence\": \"guessing\"}]")
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": %s, \"investing\": null}".formatted(saving)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.role").value(role));
		stored().andExpect(jsonPath("$.role").value(role));
	}

	@Test
	void sevenDistinctAnswersAre400() throws Exception {
		bank.question("sv-c", "sao-paulo-1", "saving", "easy");
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
				Arguments.of("negative step calls", QUICK_CHECK.replace("\"stepCallsMade\": 3", "\"stepCallsMade\": -1")),
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
