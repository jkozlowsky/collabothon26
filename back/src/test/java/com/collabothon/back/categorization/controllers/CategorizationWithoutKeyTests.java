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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restclient.test.autoconfigure.AutoConfigureMockRestServiceServer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
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
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;

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

	@Autowired
	CheckQuestionRepository questions;

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
	void theBankIsServedWithoutAKey() throws Exception {
		TestBank bank = new TestBank(questions);
		bank.question("only-one", "berlin-3", "saving", "easy");

		mvc.perform(get("/api/check-questions")).andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].id").value("only-one"));
	}

	@Test
	void aStepWithoutAKeyRunsOnTheRuleAndSaysSo() throws Exception {
		TestBank bank = new TestBank(questions);
		bank.question("sv-a", "berlin-3", "saving", "easy");
		bank.question("sv-b", "berlin-3", "saving", "easy");
		String userId = "keyless-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"start-saving\"], \"experience\": \"occasional\", \"skipped\": false}"))
			.andExpect(status().isOk());
		jev.expect(ExpectedCount.never(), requestTo("https://api.typesafe.ai/v1/systemone"));

		mvc.perform(post("/api/users/{id}/quick-check/step", userId).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"consent": false, "profile": {"ageBand": null, "savingsCover": "1-3", "horizon": "1-5y"},
					 "history": [{"questionId": "sv-a", "optionIndex": 1, "confidence": "sure"}], "useRules": false}"""))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					{"mastery": {"saving": 0.25}, "nextQuestionId": "sv-b", "done": false, "useRules": true,
					 "stepFellBack": false}""", JsonCompareMode.STRICT));
		jev.verify();
	}

	@Test
	void withASavingGoalAndMoneyNeededInYearsTheSeededBankStartsOnTheRealInterestQuestion() throws Exception {
		String userId = "demo-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"start-saving\", \"inflation\"], \"skipped\": false}"))
			.andExpect(status().isOk());

		mvc.perform(post("/api/users/{id}/quick-check/step", userId).contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"consent": false, "profile": {"ageBand": null, "savingsCover": "1-3", "horizon": "1-5y"},
					 "history": [], "useRules": false}"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nextQuestionId").value("inflation-real-value"));
	}

	@Test
	void aRunWithoutAMistakeAsksTwoQuestionsInEachAreaAndReachesAdvanced() throws Exception {
		List<String> asked = new ArrayList<>();

		play(asked, true, true, true, true).andExpect(jsonPath("$.role").value("advanced"))
			.andExpect(jsonPath("$.mastery.saving").value(0.85))
			.andExpect(jsonPath("$.mastery.investing").value(0.85));

		assertEquals(List.of("inflation-real-value", "compound-extra-year", "emergency-cushion-purpose",
				"short-term-fall"), asked);
	}

	@Test
	void aFirstWrongAnswerStillEndsAfterThreeQuestionsAsANoviceStartingInSaving() throws Exception {
		List<String> asked = new ArrayList<>();

		play(asked, false, true, true).andExpect(jsonPath("$.role").value("novice"))
			.andExpect(jsonPath("$.startLesson.lessonId").value("berlin-1"))
			.andExpect(jsonPath("$.startLesson.area").value("saving"));

		assertEquals(List.of("inflation-real-value", "emergency-cushion-purpose", "compound-extra-year"), asked);
	}

	@Test
	void aWrongSecondInvestingAnswerLeavesOneSolidAreaAndAnIntermediate() throws Exception {
		List<String> asked = new ArrayList<>();

		play(asked, true, true, true, false).andExpect(jsonPath("$.role").value("intermediate"))
			.andExpect(jsonPath("$.mastery.saving").value(0.85))
			.andExpect(jsonPath("$.mastery.investing").value(0.55));

		assertEquals(List.of("inflation-real-value", "compound-extra-year", "emergency-cushion-purpose",
				"short-term-fall"), asked);
	}

	/**
	 * Plays the seeded Quick check on the rule (consent, saving goals, money needed in 1-5 years) until it is done,
	 * answering question i right or wrong as {@code right[i]} says, then categorizes.
	 */
	private ResultActions play(List<String> asked, boolean... right) throws Exception {
		String userId = "run-" + UUID.randomUUID();
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"start-saving\", \"inflation\"], \"skipped\": false}"))
			.andExpect(status().isOk());
		String bank = mvc.perform(get("/api/check-questions")).andReturn().getResponse().getContentAsString();
		List<String> history = new ArrayList<>();
		while (true) {
			String step = mvc.perform(post("/api/users/{id}/quick-check/step", userId)
				.contentType(MediaType.APPLICATION_JSON).content(RUN.formatted(String.join(", ", history))))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
			String next = JsonPath.read(step, "$.nextQuestionId");
			if (next == null) {
				break;
			}
			List<Integer> correct = JsonPath.read(bank, "$[?(@.id == '%s')].correctIndex".formatted(next));
			int option = right[asked.size()] ? correct.getFirst() : correct.getFirst() == 0 ? 1 : 0;
			asked.add(next);
			history.add("{\"questionId\": \"%s\", \"optionIndex\": %d, \"confidence\": \"guessing\"}"
				.formatted(next, option));
		}
		assertEquals(right.length, asked.size());
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content(RUN.formatted(String.join(", ", history)))).andExpect(status().isOk());
	}

	private static final String RUN = """
			{"consent": true, "facts": {"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%%+",
			 "savesRegularly": true, "inOverdraft": false, "holdsInvestments": true, "hasLoan": true},
			 "profile": {"ageBand": "26-40", "savingsCover": null, "horizon": "1-5y"}, "history": [%s],
			 "useRules": true}""";

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
