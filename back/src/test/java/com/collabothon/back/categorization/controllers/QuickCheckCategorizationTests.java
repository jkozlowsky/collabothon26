package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static com.collabothon.back.categorization.controllers.TestPool.history;
import static com.collabothon.back.categorization.controllers.TestPool.jevAnswer;
import static com.collabothon.back.categorization.controllers.TestPool.label;
import static com.collabothon.back.categorization.controllers.TestPool.notSure;
import static com.collabothon.back.categorization.controllers.TestPool.right;
import static com.collabothon.back.categorization.controllers.TestPool.wrong;
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
import java.util.Arrays;
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
class QuickCheckCategorizationTests {

	private static final String SENTINEL = "zzsentinelzz";

	private static final String JEV_URL = "https://api.typesafe.ai/v1/systemone";

	private static final String ONBOARDING = """
			{"lifeStage": "building", "interests": ["berlin"], "experience": "occasional", "skipped": false}""";

	private static final String ANSWERS_FOR_JEV = """
			{"lifeStage": "building", "experience": "occasional", "skipped": false}""";

	private static final String PROFILE = "{\"ageBand\": null, \"savingsCover\": \"1-3\", \"horizon\": \"1-5y\"}";

	// Saving: right in berlin-1, then wrong in berlin-2. Investing: right in seoul-1, then Not sure in tokyo-1.
	// The picked Berlin path puts saving first; debt has no answer.
	private static final String HISTORY = "[" + history(right("berlin-1/q1"), wrong("berlin-2/q1"), right("seoul-1/q2"),
			notSure("tokyo-1/q1")) + "]";

	/** What Jev chooses the first lesson from after those answers: per area the lesson answered not right, then one more. */
	private static final String[] CHOICES = { "berlin-2", "berlin-1", "tokyo-1", "seoul-1" };

	private static final String ONE_RIGHT = "[" + right("berlin-1/q1") + "]";

	private static final String QUICK_CHECK = """
			{"consent": false, "profile": %s, "history": %s, "mastery": {"saving": 0.425, "investing": 0.5},
			 "useRules": false, "stepCallsMade": 3}""".formatted(PROFILE, HISTORY);

	private static final String FACTS = """
			{"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true,
			 "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}""";

	private static final String NO_QUICK_CHECK = "{\"consent\": false}";

	private static final String PROFILE_WITH_CONSENT = PROFILE.replace("\"1-3\"", "null");

	/** The same Quick check with consent: an account that saves every month and holds investments. */
	private static final String WITH_FACTS = QUICK_CHECK
		.replace("\"consent\": false", "\"consent\": true, \"facts\": " + FACTS)
		.replace(PROFILE, PROFILE_WITH_CONSENT);

	private static final String ALL_SOLID = QUICK_CHECK
		.replace(HISTORY, "[" + history(right("berlin-1/q1"), right("berlin-2/q1"), right("sao-paulo-1/q1"),
				right("sao-paulo-3/q2"), right("seoul-1/q2"), right("tokyo-1/q1")) + "]")
		.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": 0.9, \"debt\": 0.9, \"investing\": 0.9}");

	private static final String PICKED = " The person picked this path as new to them.";

	private static final String PICKED_AND_SOLID = " The person picked this path as new to them; the test showed they"
			+ " already know the basics.";

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
	CategorizationRepository categorizations;

	@Autowired
	JsonMapper json;

	@Autowired
	Clock clock;

	@Autowired
	LessonContentRepository lessonContent;

	private String userId;

	@BeforeEach
	void ownUser() throws Exception {
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

	private void onboardWithInterests(String... storyIds) throws Exception {
		onboard("{\"interests\": %s, \"experience\": \"occasional\", \"skipped\": false}"
			.formatted(json.writeValueAsString(storyIds)));
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

	private static String gap(String area, String chosen) {
		return choice("gap_" + area, chosen, "habit_ahead", "knowledge_ahead", "aligned");
	}

	private static String jevFinal(String extra) {
		return "{\"model\": \"jev-2026-05\", \"answers\": {" + F1_ANSWERS + extra + "}}";
	}

	/** Jev's answer to the first lesson, among the lessons it was given. */
	private static String firstLesson(String chosen, String... lessonIds) {
		return choice("first_lesson", label(chosen), Arrays.stream(lessonIds).map(TestPool::label).toArray(String[]::new));
	}

	@Test
	void theFinalCallIsF1PlusTheSpecifiedQuestionsAndItsLabelsPickTheLessonAndGaps() throws Exception {
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(withSuccess(jevFinal(gap("saving", "habit_ahead") + gap("investing", "knowledge_ahead")
					+ firstLesson("tokyo-1", CHOICES)), MediaType.APPLICATION_JSON));

		// The rule would start in Berlin (berlin-2, the weakest area's lowest score); Jev's Tokyo lesson wins.
		// Jev's "knowledge_ahead" for investing is dropped: the account holds investments.
		categorize(WITH_FACTS).andExpect(status().isOk())
			.andExpect(content().json("""
					{"source": "jev", "role": "intermediate", "profile": %s,
					 "mastery": {"saving": 0.425, "debt": null, "investing": 0.5}, "answerCount": 4,
					 "gaps": [
					   {"area": "saving", "direction": "habit-ahead",
					    "because": "Your account shows you move money to savings every month. Your Saving answers leave a few things open to explore."}],
					 "startLesson": {"lessonId": "tokyo-1", "title": "%2$s", "area": "investing", "storyId": "tokyo",
					                 "storyCity": "Tokyo"},
					 "readyForNext": false,
					 "pathStoryIds": ["tokyo", "berlin", "buenos-aires", "nairobi", "seoul", "mumbai", "sao-paulo"],
					 "startHere": {"lessonId": "tokyo-1", "title": "%2$s", "area": "investing", "storyId": "tokyo",
					               "storyCity": "Tokyo"},
					 "sharedWithModel": {"facts": %4$s, "answers": %3$s, "profile": %1$s, "answerCount": 4, "stepCallsMade": 3}}"""
				.formatted(PROFILE_WITH_CONSENT, title("tokyo-1"), ONBOARDING, FACTS),
					JsonCompareMode.LENIENT))
			.andExpect(jsonPath("$.gaps.length()").value(1));

		assertEquals(json.readTree("""
				{"answers": %s, "interests": [%s], "facts": %s, "profile": %s, "checkAnswers": [%s]}"""
			.formatted(ANSWERS_FOR_JEV, TestPool.interest("berlin"), FACTS, PROFILE_WITH_CONSENT, String.join(", ",
					jevAnswer("saving", "berlin-1", "correct"), jevAnswer("saving", "berlin-2", "wrong"),
					jevAnswer("investing", "seoul-1", "correct"), jevAnswer("investing", "tokyo-1", "not-sure")))),
				sent.get().get("state"));
		assertEquals(json.readTree("""
				{"area": "saving", "lessonId": "berlin-2", "topic": "An emergency fund",
				 "concepts": ["emergency-fund", "liquidity"], "result": "wrong"}"""),
				sent.get().at("/state/checkAnswers/1"));
		JsonNode block = SpecBlocks.read(json, "jev-final-questions");
		ObjectNode expected = (ObjectNode) SpecBlocks.read(json, SpecBlocks.F1, "jev-questions").deepCopy();
		expected.set("gap_saving", block.get("gap_saving"));
		expected.set("gap_investing", block.get("gap_investing"));
		ObjectNode firstLesson = (ObjectNode) block.get("first_lesson").deepCopy();
		ObjectNode criteria = firstLesson.putObject("criteria");
		for (String lessonId : CHOICES) {
			// berlin-1 is the picked path's start lesson; berlin-2 is there as a gap lesson.
			criteria.put(label(lessonId), TestPool.criterion(lessonId) + (lessonId.equals("berlin-1") ? PICKED : ""));
		}
		expected.set("first_lesson", firstLesson);
		assertEquals(expected, sent.get().get("questions"));
		assertEquals("Saving, bonds, stocks and funds. Covers: stock, bond, etf, time horizon.",
				sent.get().at("/questions/first_lesson/criteria/saving_bonds_stocks_and_funds").stringValue());
	}

	@Test
	void jevsLessonChoosesTheStoryAndTheStartIsThatStorysFirstLessonNotDone() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(firstLesson("seoul-1", CHOICES)), MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(firstLesson("berlin-2", CHOICES)), MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("seoul-1"))
			.andExpect(jsonPath("$.startLesson.area").value("investing"))
			.andExpect(jsonPath("$.pathStoryIds[0]").value("seoul"));
		// The app opens a story's lessons in order, so berlin-2 starts the path at Berlin's first lesson.
		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-1"))
			.andExpect(jsonPath("$.startLesson.storyId").value("berlin"));
	}

	@Test
	void aJevLessonOutsideTheOnesItWasGivenPutsTheCategorisationOnRules() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(firstLesson("tokyo-2", "berlin-2", "berlin-1", "tokyo-1", "tokyo-2")),
					MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-1"))
			.andExpect(jsonPath("$.startLesson.area").value("saving"));
	}

	@Test
	void aJevGapLabelTheRuleDoesNotBackReadsAsAligned() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(gap("saving", "habit_ahead") + gap("investing", "knowledge_ahead")
					+ firstLesson("berlin-1", "berlin-1", "buenos-aires-1", "seoul-1", "tokyo-1")), MediaType.APPLICATION_JSON));
		// Right on saving and on investing, with both habits in the account: the rule finds no gap.
		String history = "[" + history(right("berlin-1/q1"), right("seoul-1/q2")) + "]";

		categorize(WITH_FACTS.replace(HISTORY, history)).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.gaps").isEmpty());
	}

	@Test
	void withoutFactsJevIsNotAskedAboutGapsAndThereAreNone() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(MockRestRequestMatchers.jsonPath("$.questions.gap_saving").doesNotExist())
			.andExpect(MockRestRequestMatchers.jsonPath("$.questions.gap_investing").doesNotExist())
			.andRespond(withSuccess(jevFinal(firstLesson("berlin-2", CHOICES)), MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.gaps").isEmpty());
	}

	@Test
	void aBrokenGapAnswerPutsTheWholeCategorisationOnRules() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(gap("saving", "habit_ahead") + firstLesson("tokyo-1", CHOICES)),
					MediaType.APPLICATION_JSON));

		// The rule: both habits are in the account, and each area has an answer that is not right.
		categorize(WITH_FACTS).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.gaps.length()").value(2))
			.andExpect(jsonPath("$.gaps[0].area").value("saving"))
			.andExpect(jsonPath("$.gaps[0].direction").value("habit-ahead"))
			.andExpect(jsonPath("$.gaps[1].area").value("investing"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-1"))
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(3));
	}

	@Test
	void useRulesMakesNoFinalCallAndSharedWithModelStillCountsTheSteps() throws Exception {
		categorize(onRules(QUICK_CHECK)).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.sharedWithModel.stepCallsMade").value(3))
			.andExpect(jsonPath("$.sharedWithModel.answers").isEmpty())
			.andExpect(jsonPath("$.sharedWithModel.interests[0]").value("berlin"));

		categorize(onRules(QUICK_CHECK).replace("\"stepCallsMade\": 3", "\"stepCallsMade\": 0"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.sharedWithModel").isEmpty());
	}

	@Test
	void theStoredRowKeepsTheCountButNoAnswer() throws Exception {
		String history = "[" + history(wrong("berlin-1/q1"), notSure("berlin-1/q2"), right("seoul-1/q2")) + "]";

		categorize(onRules(QUICK_CHECK.replace(HISTORY, history))).andExpect(status().isOk());

		String data = categorizations.findData(userId).orElseThrow();
		JsonNode row = json.readTree(data);
		assertEquals(3, row.get("answerCount").intValue());
		assertFalse(row.has("startHere"));
		for (String leak : new String[] { "/q1", "/q2", "questionId", "optionIndex", "history" }) {
			assertFalse(data.contains(leak), leak);
		}
	}

	@Test
	void withLifeStageSkippedTheAgeBandGivesItOnlyAtTheEnds() throws Exception {
		onboard("{\"interests\": [\"berlin\"], \"experience\": \"occasional\", \"skipped\": false}");

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
		// Saving's three stories (it is weakest), then investing's three, then debt, which has no answer.
		assertEquals(json.readTree(
				"[\"berlin\", \"buenos-aires\", \"nairobi\", \"seoul\", \"tokyo\", \"mumbai\", \"sao-paulo\"]"),
				json.readTree(path).get("pathStoryIds"));
		stored().andExpect(jsonPath("$.startHere.lessonId").value("berlin-1"));

		complete("berlin-1");
		stored().andExpect(content().json("""
				{"startHere": {"lessonId": "berlin-2", "title": "%s", "area": "saving", "storyId": "berlin",
				               "storyCity": "Berlin"}}""".formatted(title("berlin-2")), JsonCompareMode.LENIENT));

		completeStory("berlin");
		stored().andExpect(content().json("{\"startHere\": {\"lessonId\": \"buenos-aires-1\", \"area\": \"saving\"}}",
				JsonCompareMode.LENIENT));

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
			.andExpect(jsonPath("$.pathStoryIds.length()").value(6));
	}

	@Test
	void aPostWithAHistoryAsksJevAgainInsteadOfReusingTheLastResult() throws Exception {
		String body = QUICK_CHECK.replace(HISTORY, ONE_RIGHT);
		for (int i = 0; i < 2; i++) {
			jev.expect(requestTo(JEV_URL))
				.andRespond(withSuccess(jevFinal(firstLesson("berlin-1", "berlin-1", "buenos-aires-1")),
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
					{"profile": null, "mastery": {}, "gaps": [], "answerCount": 0, "readyForNext": false,
					 "pathStoryIds": [], "startHere": null}""", JsonCompareMode.LENIENT));
	}

	private JsonNode categorized(String body) throws Exception {
		return json.readTree(categorize(body).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
	}

	@Test
	void anAnsweredAreaWithoutAMasteryValueIsStoredWithTheRuleMean() throws Exception {
		categorize(onRules(QUICK_CHECK.replace("\"investing\": 0.5", "\"investing\": null"))).andExpect(status().isOk());
		stored().andExpect(content().json("{\"mastery\": {\"saving\": 0.425, \"investing\": 0.55}}",
				JsonCompareMode.LENIENT));

		categorize(onRules(QUICK_CHECK.replace(HISTORY, "[" + wrong("berlin-1/q1") + "]")
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
					{"sharedWithModel": {"facts": null, "answers": null, "interests": ["berlin"], "profile": null,
					 "answerCount": 0, "stepCallsMade": 2}}""", JsonCompareMode.LENIENT));
	}

	@Test
	void aRequestWithoutTheQuickCheckDoesNotReuseAQuickCheckResult() throws Exception {
		for (int i = 0; i < 2; i++) {
			jev.expect(requestTo(JEV_URL))
				.andRespond(withSuccess(jevFinal(firstLesson("berlin-2", CHOICES)), MediaType.APPLICATION_JSON));
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
					{"profile": null, "mastery": {}, "gaps": [], "answerCount": 0}""", JsonCompareMode.LENIENT));
	}

	@Test
	void withoutTheRangesTheHistoryIsNotCheckedAgainstThePool() throws Exception {
		categorize(onRules("""
				{"consent": false, "history": [{"questionId": "gone-from-the-lessons", "optionIndex": 7}],
				 "mastery": {"risk": 0.5}, "useRules": true}"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.answerCount").value(0));
	}

	@Test
	void withoutTheQuickCheckTheFirstLessonFollowsTheJudgedFocus() throws Exception {
		// Interests put saving first; Jev's focus puts investing ahead of it.
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(jevFinal(""), MediaType.APPLICATION_JSON));

		categorize(NO_QUICK_CHECK).andExpect(status().isOk())
			.andExpect(jsonPath("$.startLesson.lessonId").value("seoul-1"))
			.andExpect(jsonPath("$.pathStoryIds[0]").value("seoul"));
	}

	@Test
	void oneCandidateIsTheFirstLessonWithoutAskingJev() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(MockRestRequestMatchers.jsonPath("$.questions.first_lesson")
				.doesNotExist())
			.andRespond(withSuccess(jevFinal(""), MediaType.APPLICATION_JSON));

		onboardWithInterests();
		// Of the investing lessons only seoul-5 is left to do.
		completeStory("tokyo");
		completeStory("mumbai");
		complete("seoul-1", "seoul-2", "seoul-3", "seoul-4");

		categorize(QUICK_CHECK.replace(HISTORY, "[" + right("seoul-1/q2") + "]")
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": null, \"investing\": 0.85}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("seoul-5"));
	}

	@Test
	void aSolidPickedPathOffersItsLaterLessonAndOnlyInterestLessonsSayWhy() throws Exception {
		onboardWithInterests("berlin", "sao-paulo");
		AtomicReference<JsonNode> sent = new AtomicReference<>();
		jev.expect(requestTo(JEV_URL))
			.andExpect(request -> sent.set(json.readTree(((MockClientHttpRequest) request).getBodyAsString())))
			.andRespond(withSuccess(jevFinal(firstLesson("berlin-3", "seoul-1", "tokyo-1", "berlin-3", "sao-paulo-1")),
					MediaType.APPLICATION_JSON));

		// Saving is Solid through berlin-1 and berlin-2, investing has the gap, debt was not asked about.
		// Jev weighs berlin-3, yet the app still opens Berlin at its first lesson not done.
		categorize(QUICK_CHECK
			.replace(HISTORY, "[" + history(right("berlin-1/q1"), right("berlin-2/q1"), wrong("seoul-1/q2")) + "]")
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": 0.9, \"investing\": 0.25}"))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"source": "jev", "readyForNext": false,
					 "startLesson": {"lessonId": "berlin-1", "area": "saving", "storyId": "berlin"},
					 "pathStoryIds": ["berlin", "seoul", "tokyo", "mumbai", "sao-paulo"]}""", JsonCompareMode.LENIENT));

		ObjectNode criteria = json.createObjectNode()
			.put(label("seoul-1"), TestPool.criterion("seoul-1"))
			.put(label("tokyo-1"), TestPool.criterion("tokyo-1"))
			.put(label("berlin-3"), TestPool.criterion("berlin-3") + PICKED_AND_SOLID)
			.put(label("sao-paulo-1"), TestPool.criterion("sao-paulo-1") + PICKED);
		assertEquals(criteria, sent.get().at("/questions/first_lesson/criteria"));
	}

	@Test
	void withEveryAreaSolidJevsPickAmongTheInterestsIsHonoured() throws Exception {
		onboardWithInterests("berlin", "tokyo");
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(firstLesson("tokyo-2", "berlin-3", "tokyo-2")), MediaType.APPLICATION_JSON));

		categorize(ALL_SOLID).andExpect(status().isOk())
			.andExpect(content().json("""
					{"source": "jev", "readyForNext": true,
					 "startLesson": {"lessonId": "tokyo-1", "area": "investing", "storyId": "tokyo"},
					 "pathStoryIds": ["tokyo"]}""", JsonCompareMode.LENIENT));
	}

	@Test
	void withConsentTheFactsReachJevAndItsAlignedLabelsLeaveNoGap() throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andExpect(MockRestRequestMatchers.jsonPath("$.state.facts.incomeBand")
				.value("2-3.5k"))
			.andRespond(withSuccess(jevFinal(gap("saving", "aligned") + gap("investing", "aligned")
					+ firstLesson("berlin-2", CHOICES)), MediaType.APPLICATION_JSON));

		// The rule alone, and F1's facts table, would each give two cards for these answers and facts.
		categorize(WITH_FACTS).andExpect(status().isOk())
			.andExpect(jsonPath("$.bankData").value(true))
			.andExpect(jsonPath("$.gaps").isEmpty());
	}

	@Test
	void theSavingsCoverAndTheAgeBandFeedTheRuleFocus() throws Exception {
		onboard("{\"interests\": [\"tokyo\"], \"experience\": \"planning\", \"skipped\": false}");

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
		onboardWithInterests();

		categorize(onRules(ALL_SOLID))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"readyForNext": true, "startLesson": {"lessonId": "seoul-1", "storyId": "seoul"},
					 "pathStoryIds": ["seoul"], "startHere": {"lessonId": "seoul-1"}}""", JsonCompareMode.LENIENT));

		completeStory("seoul");
		stored().andExpect(status().isOk()).andExpect(jsonPath("$.startHere").isEmpty());
	}

	@Test
	void everyAreaSolidStillPutsThePickedPathSecondAndStartHereMovesOnToIt() throws Exception {
		assertEquals(json.readTree("[\"seoul\", \"berlin\"]"), categorized(onRules(ALL_SOLID)).get("pathStoryIds"));

		completeStory("seoul");
		stored().andExpect(jsonPath("$.startHere.lessonId").value("berlin-1"));
	}

	@ParameterizedTest(name = "Jev {0}, saving mastery {1} -> {2}")
	@CsvSource({ "advanced, 0.39, novice", "intermediate, 0.39, novice", "advanced, 0.4, advanced",
			"intermediate, 0.4, intermediate" })
	void withoutAnAreaAtLeastBuildingTheRoleIsNovice(String jevRole, String saving, String role) throws Exception {
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(jevFinal(firstLesson("berlin-1", "berlin-1", "buenos-aires-1"))
				.replace("""
						"role": {"type": "choice", "choice": "intermediate", "confidence": 0.8,
						         "probabilities": {"novice": 0.1, "intermediate": 0.8, "advanced": 0.1}}""",
						choice("role", jevRole, "novice", "intermediate", "advanced").substring(2)),
					MediaType.APPLICATION_JSON));

		categorize(QUICK_CHECK.replace(HISTORY, ONE_RIGHT)
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{\"saving\": %s, \"investing\": null}".formatted(saving)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("jev"))
			.andExpect(jsonPath("$.role").value(role));
		stored().andExpect(jsonPath("$.role").value(role));
	}

	@ParameterizedTest(name = "experience {0}, {1} Solid areas -> {2}")
	@CsvSource({ "null, 2, advanced", "null, 1, intermediate", "null, 0, novice", "'\"occasional\"', 2, novice",
			"'\"regular\"', 0, intermediate" })
	void onRulesTheRoleComesFromTheAnswersOnlyWithoutADeclaredExperience(String experience, int solidAreas,
			String role) throws Exception {
		onboard("{\"interests\": [\"berlin\"], \"experience\": %s, \"skipped\": false}".formatted(experience));
		// Two right answers make an area Solid, one wrong answer leaves it at Building; debt was not asked about.
		String history = "[" + history(right("berlin-1/q1"),
				solidAreas < 1 ? wrong("berlin-2/q1") : right("berlin-2/q1"), right("seoul-1/q2"),
				solidAreas < 2 ? wrong("tokyo-1/q1") : right("tokyo-1/q1")) + "]";

		categorize(onRules(QUICK_CHECK.replace(HISTORY, history)
			.replace("{\"saving\": 0.425, \"investing\": 0.5}", "{}"))).andExpect(status().isOk())
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.role").value(role));
	}

	@Test
	void sevenDistinctAnswersAre400() throws Exception {
		List<String> seven = List.of("berlin-1/q1", "berlin-1/q2", "berlin-2/q1", "berlin-1/q3", "seoul-1/q2",
				"seoul-3/q1", "tokyo-1/q1");

		categorize(onRules(QUICK_CHECK.replace(HISTORY,
				"[" + history(seven.stream().map(TestPool::notSure).toArray(String[]::new)) + "]")))
			.andExpect(status().isBadRequest());
		categorize(onRules(QUICK_CHECK.replace(HISTORY,
				"[" + history(seven.stream().limit(6).map(TestPool::notSure).toArray(String[]::new)) + "]")))
			.andExpect(status().isOk());
	}

	static Stream<Arguments> badFinals() {
		return Stream.of(
				Arguments.of("mastery for an area without questions",
						QUICK_CHECK.replace("\"investing\": 0.5", "\"risk\": 0.5")),
				Arguments.of("mastery for an unknown area",
						QUICK_CHECK.replace("\"investing\": 0.5", "\"" + SENTINEL + "\": 0.5")),
				Arguments.of("mastery above 1", QUICK_CHECK.replace("0.425", "1.2")),
				Arguments.of("mastery below 0", QUICK_CHECK.replace("0.425", "-0.1")),
				Arguments.of("unknown question", QUICK_CHECK.replace("\"tokyo-1/q1\"", "\"" + SENTINEL + "\"")),
				Arguments.of("repeated question", QUICK_CHECK.replace("\"tokyo-1/q1\"", "\"berlin-1/q1\"")),
				// berlin-2/q1 is true or false: two options.
				Arguments.of("option past the last one", QUICK_CHECK.replace(wrong("berlin-2/q1"),
						"{\"questionId\": \"berlin-2/q1\", \"optionIndex\": 2}")),
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
