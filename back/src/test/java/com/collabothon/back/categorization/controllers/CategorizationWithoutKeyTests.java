package com.collabothon.back.categorization.controllers;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.random.RandomGenerator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restclient.test.autoconfigure.AutoConfigureMockRestServiceServer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.jayway.jsonpath.JsonPath;

import com.collabothon.back.Race;
import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.categorization.repositories.CategorizationRepository;

// The default for teammates: no key, so nothing may reach the hosted API.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=")
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
@Transactional
class CategorizationWithoutKeyTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	private static final FixedRandom RANDOM = new FixedRandom();

	@TestBean
	RandomGenerator random;

	static RandomGenerator random() {
		return RANDOM;
	}

	@BeforeEach
	void drawTheFirstQuestion() {
		RANDOM.index = 0;
	}

	@Autowired
	CategorizationRepository categorizations;

	@Autowired
	TransactionTemplate tx;

	@Test
	void fallsBackWithoutCallingJev() throws Exception {
		mvc.perform(put("/api/users/tom/profile/onboarding").contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"stocks-etfs\"], \"experience\": \"occasional\", \"skipped\": false}"))
			.andExpect(status().isOk());

		mvc.perform(post("/api/users/tom/categorization").contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"consent": true, "facts": {"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
					 "savesRegularly": true, "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}}"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.bankData").value(true))
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.sharedWithModel").isEmpty());
		jev.verify();
	}

	@Test
	void theQuestionsAreServedWithoutAKey() throws Exception {
		mvc.perform(get("/api/check-questions")).andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(25))
			// seoul-1/q1 names the story's character, so the list starts at the lesson's other question.
			.andExpect(jsonPath("$[0].id").value("seoul-1/q2"));
	}

	@Test
	void aStepWithoutAKeyRunsOnTheRuleAndSaysSo() throws Exception {
		String userId = "keyless-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"start-saving\"], \"experience\": \"occasional\", \"skipped\": false}"))
			.andExpect(status().isOk());
		jev.expect(ExpectedCount.never(), requestTo("https://api.typesafe.ai/v1/systemone"));

		mvc.perform(post("/api/users/{id}/quick-check/step", userId).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"consent": false, "profile": {"ageBand": null, "savingsCover": "1-3", "horizon": "1-5y"},
					 "history": [%s], "useRules": false}""".formatted(TestPool.wrong("berlin-1/q1"))))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25, "debt": null, "investing": null}, "nextQuestionId": "berlin-1/q2",
					 "done": false, "useRules": true, "stepFellBack": false}""", JsonCompareMode.STRICT));
		jev.verify();
	}

	@Test
	void aRunWithoutAMistakeAsksTwoQuestionsInEveryAreaAndReachesAdvanced() throws Exception {
		List<String> asked = new ArrayList<>();

		play(asked, true, true, true, true, true, true).andExpect(jsonPath("$.role").value("advanced"))
			.andExpect(jsonPath("$.mastery.saving").value(0.85))
			.andExpect(jsonPath("$.mastery.debt").value(0.85))
			.andExpect(jsonPath("$.mastery.investing").value(0.85))
			// Every area is Solid, so the path is the first story with a lesson left.
			.andExpect(jsonPath("$.readyForNext").value(true))
			.andExpect(jsonPath("$.startLesson.lessonId").value("seoul-1"))
			.andExpect(jsonPath("$.gaps").isEmpty());

		assertEquals(List.of("berlin-1/q1", "sao-paulo-1/q1", "seoul-1/q2", "berlin-2/q1", "sao-paulo-3/q2", "seoul-3/q1"),
				asked);
	}

	@Test
	void aMistakeInTheFourthAnswerEndsTheRunThereAsIntermediate() throws Exception {
		List<String> asked = new ArrayList<>();

		play(asked, true, true, true, false).andExpect(jsonPath("$.role").value("intermediate"))
			.andExpect(jsonPath("$.mastery.saving").value(0.55));

		assertEquals(List.of("berlin-1/q1", "sao-paulo-1/q1", "seoul-1/q2", "berlin-2/q1"), asked);
	}

	@Test
	void alexWithAFirstWrongAnswerGetsASecondBerlinQuestionThenTheOtherAreasAndStartsInBerlin() throws Exception {
		for (int draw = 0; draw < 2; draw++) {
			RANDOM.index = draw;
			List<String> asked = new ArrayList<>();

			// Saving 0.55; debt and investing 0.85 with one answer each: not Solid, but high on the map.
			play(asked, false, true, true, true).andExpect(jsonPath("$.role").value("intermediate"))
				.andExpect(jsonPath("$.mastery.saving").value(0.55))
				.andExpect(jsonPath("$.mastery.debt").value(0.85))
				.andExpect(jsonPath("$.mastery.investing").value(0.85))
				.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-1"))
				.andExpect(jsonPath("$.startLesson.area").value("saving"))
				// He saves every month and got a saving answer wrong; he invests and answered investing right.
				.andExpect(content().json("""
						{"gaps": [{"area": "saving", "direction": "habit-ahead",
						  "because": "Your account shows you move money to savings every month. Your Saving answers leave a few things open, which is where your first lesson starts."}]}""",
						JsonCompareMode.LENIENT))
				.andExpect(jsonPath("$.gaps.length()").value(1));

			// Both berlin-1 questions come, in the drawn order.
			assertEquals(draw == 0 ? List.of("berlin-1/q1", "berlin-1/q2", "sao-paulo-1/q1", "seoul-1/q2")
					: List.of("berlin-1/q2", "berlin-1/q1", "sao-paulo-1/q1", "seoul-1/q2"), asked);
		}
	}

	@Test
	void everyAnswerRightWithoutTheHabitsIsKnowledgeAheadInBothAreas() throws Exception {
		play(NO_HABITS, new ArrayList<>(), true, true, true, true, true, true)
			.andExpect(jsonPath("$.gaps.length()").value(2))
			.andExpect(content().json("""
					{"gaps": [
					  {"area": "saving", "direction": "knowledge-ahead",
					   "because": "Your Saving answers show you understand how it works. Your account shows no monthly transfer to savings."},
					  {"area": "investing", "direction": "knowledge-ahead",
					   "because": "Your Investing answers show you understand how it works. Your account shows no investment products."}]}""",
					JsonCompareMode.LENIENT));
	}

	@Test
	void withoutFactsThereAreNoGaps() throws Exception {
		play(NO_FACTS, new ArrayList<>(), false, true, true, true).andExpect(jsonPath("$.gaps").isEmpty());
	}

	@Test
	void aRunWithEveryAnswerWrongStaysInBerlinAndIsANovice() throws Exception {
		List<String> asked = new ArrayList<>();

		play(asked, false, false, false, false).andExpect(jsonPath("$.role").value("novice"))
			.andExpect(jsonPath("$.mastery.saving").value(0.25))
			.andExpect(jsonPath("$.mastery.debt").isEmpty());

		assertEquals(List.of("berlin-1/q1", "berlin-1/q2", "berlin-2/q1", "berlin-2/q2"), asked);
	}

	private ResultActions play(List<String> asked, boolean... right) throws Exception {
		return play(ALEX, asked, right);
	}

	/**
	 * Plays the Quick check on the rule (saving goals, money needed in 1-5 years) until it is done,
	 * answering question i right or wrong as {@code right[i]} says, then categorizes.
	 */
	private ResultActions play(String account, List<String> asked, boolean... right) throws Exception {
		String userId = "run-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"start-saving\", \"inflation\"], \"skipped\": false}"))
			.andExpect(status().isOk());
		String pool = mvc.perform(get("/api/check-questions")).andReturn().getResponse().getContentAsString();
		List<String> history = new ArrayList<>();
		while (true) {
			String step = mvc.perform(post("/api/users/{id}/quick-check/step", userId)
				.contentType(MediaType.APPLICATION_JSON).content(RUN.formatted(account, String.join(", ", history))))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
			String next = JsonPath.read(step, "$.nextQuestionId");
			if (next == null) {
				break;
			}
			List<Integer> correct = JsonPath.read(pool, "$[?(@.id == '%s')].correctIndex".formatted(next));
			int option = right[asked.size()] ? correct.getFirst() : correct.getFirst() == 0 ? 1 : 0;
			asked.add(next);
			history.add("{\"questionId\": \"%s\", \"optionIndex\": %d}"
				.formatted(next, option));
		}
		assertEquals(right.length, asked.size());
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content(RUN.formatted(account, String.join(", ", history)))).andExpect(status().isOk());
	}

	private static final String RUN = """
			{%s, "profile": {"ageBand": "26-40", "savingsCover": null, "horizon": "1-5y"}, "history": [%s],
			 "useRules": true}""";

	/** The seeded demo customer: saves every month and holds investments. */
	private static final String ALEX = """
			"consent": true, "facts": {"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
			 "savesRegularly": true, "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}""";

	private static final String NO_HABITS = ALEX.replace("\"savesRegularly\": true", "\"savesRegularly\": false")
		.replace("\"holdsInvestments\": true", "\"holdsInvestments\": false");

	private static final String NO_FACTS = "\"consent\": false";

	@Test
	@Transactional(propagation = Propagation.NOT_SUPPORTED)
	void aDoubleTapOnCategorizeKeepsOneResultAndFailsNothing() throws Exception {
		String userId = "tap-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"stocks-etfs\"], \"experience\": \"occasional\", \"skipped\": false}"))
			.andExpect(status().isOk());

		int second = Race.secondDuringFirst(tx, () -> categorize(userId), () -> categorize(userId));

		assertEquals(200, second);
		assertTrue(categorizations.findData(userId).isPresent());
	}

	private int categorize(String userId) throws Exception {
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"consent\": false}")).andReturn().getResponse().getStatus();
	}
}
