package com.collabothon.back.categorization.controllers;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.nio.channels.ClosedChannelException;
import java.time.Clock;
import java.time.Instant;
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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.transaction.support.TransactionTemplate;

import com.collabothon.back.MutableClock;
import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.repositories.CategorizationRepository;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
class CategorizationControllerTests {

	private static final String JEV_URL = "https://api.typesafe.ai/v1/systemone";

	private static final String ANSWERS = """
			{"lifeStage": "building", "interests": ["berlin", "tokyo"], "experience": "occasional",
			 "skipped": false}""";

	// The same answers as Jev gets them: only those with a value, and no interest ids.
	private static final String ANSWERS_FOR_JEV = """
			{"lifeStage": "building", "experience": "occasional"}""";

	// What the app computes from the front seed customer (spec: `factsFrom` on the seed).
	private static final String FACTS = """
			{"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+", "savesRegularly": true,
			 "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}""";

	private static final String WITH_FACTS = "{\"consent\": true, \"facts\": " + FACTS + "}";

	private static final String JEV_ANSWER = """
			{"model": "jev-2026-05", "answers": {
			  "role": {"type": "choice", "choice": "intermediate", "confidence": 0.8,
			           "probabilities": {"novice": 0.1, "intermediate": 0.8, "advanced": 0.1}},
			  "focus_saving": {"type": "noul", "noul": 0.2},
			  "focus_debt": {"type": "noul", "noul": 0.7},
			  "focus_investing": {"type": "noul", "noul": 0.9},
			  "focus_risk": {"type": "noul", "noul": 0.6},
			  "focus_retirement": {"type": "noul", "noul": 0.1}},
			 "usage": {"input_tokens": 510, "output_tokens": 12}}""";

	private static final Instant START = Instant.parse("2026-06-15T10:00:00Z");

	private static final MutableClock CLOCK = new MutableClock(START);

	@TestBean
	Clock clock;

	static Clock clock() {
		return CLOCK;
	}

	@Autowired
	JsonMapper json;

	@Autowired
	LessonContentRepository lessonContent;

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	CategorizationRepository categorizations;

	@Autowired
	TransactionTemplate tx;

	// Boot resets only the stub; the clock is reset before each test, as a failed verify would skip an after-hook.
	@BeforeEach
	void resetClock() {
		CLOCK.set(START);
	}

	@AfterEach
	void verifyJev() {
		jev.verify();
	}

	// The reset also drops any earlier categorisation, so each test starts without a reusable result.
	private void onboard(String userId, String answers) throws Exception {
		mvc.perform(delete("/api/users/{id}/profile/onboarding", userId)).andExpect(status().isNoContent());
		mvc.perform(put("/api/users/{id}/profile/onboarding", userId).contentType(MediaType.APPLICATION_JSON)
			.content(answers)).andExpect(status().isOk());
	}

	private ResultActions categorize(String userId, String body) throws Exception {
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	@Test
	void alexIsCategorisedByJev() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andExpect(method(HttpMethod.POST))
			.andExpect(header("Authorization", "Bearer test-key"))
			.andExpect(content().json("""
					{"model": "jev-1.14.0", "state": {"answers": %s, "interests": [%s, %s], "facts": %s}, "questions": %s}"""
				.formatted(ANSWERS_FOR_JEV, TestPool.interest("berlin"), TestPool.interest("tokyo"), FACTS,
						SpecBlocks.read(json, SpecBlocks.F1, "jev-questions")), JsonCompareMode.STRICT))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		String expected = """
				{"userId": "alex", "consent": true, "bankData": true, "role": "intermediate", "lifeStage": "family",
				 "focusAreas": ["investing", "debt", "risk"],
				 "gaps": [
				   {"area": "saving", "direction": "habit-ahead",
				    "because": "You said: I save now and then. Money goes to savings or investments every month."},
				   {"area": "investing", "direction": "habit-ahead",
				    "because": "You said: I save now and then. Your accounts with us include investment products."}],
				 "lessonVariant": {"persona": "family", "level": "beginner", "lang": "standard"},
				 "explanation": [
				   {"output": "role", "probabilities": {"novice": 0.1, "intermediate": 0.8, "advanced": 0.1},
				    "because": ["You said: I save now and then.", "Money goes to savings or investments every month.",
				                "Your accounts with us include investment products."]},
				   {"output": "focusAreas",
				    "probabilities": {"saving": 0.2, "debt": 0.7, "investing": 0.9, "risk": 0.6, "retirement": 0.1},
				    "because": ["Your accounts cover more than 6 months of spending.", "You said Investing is new to you.",
				                "You are paying off a loan with us.",
				                "Your accounts with us include investment products."]}],
				 "profile": null, "mastery": {}, "answerCount": 0,
				 "startLesson": {"lessonId": "berlin-1", "title": "%1$s", "area": "saving", "storyId": "berlin",
				                 "storyCity": "Berlin"},
				 "readyForNext": false,
				 "pathStoryIds": ["berlin", "tokyo", "seoul", "mumbai", "sao-paulo", "buenos-aires", "nairobi"],
				 "startHere": {"lessonId": "berlin-1", "title": "%1$s", "area": "saving", "storyId": "berlin",
				               "storyCity": "Berlin"},
				 "sharedWithModel": {"facts": %2$s, "answers": %3$s, "interests": ["berlin", "tokyo"], "profile": null, "answerCount": 0, "stepCallsMade": 0},
				 "source": "jev", "model": "jev-2026-05", "categorizedAt": "2026-06-15T10:00:00Z"}"""
			.formatted(lessonContent.findById("berlin-1").orElseThrow().title(), FACTS, ANSWERS);

		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json(expected, JsonCompareMode.STRICT));
		mvc.perform(get("/api/users/alex/categorization"))
			.andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json(expected, JsonCompareMode.STRICT));
	}

	static Stream<Arguments> brokenJev() {
		return Stream.of(
				Arguments.of("500", withServerError()),
				Arguments.of("timeout", withException(new SocketTimeoutException())),
				Arguments.of("unknown label",
						withSuccess(JEV_ANSWER.replace("\"choice\": \"intermediate\"", "\"choice\": \"expert\""),
								MediaType.APPLICATION_JSON)),
				Arguments.of("probability above 1",
						withSuccess(JEV_ANSWER.replace("\"noul\": 0.9", "\"noul\": 1.5"), MediaType.APPLICATION_JSON)),
				Arguments.of("missing question",
						withSuccess(JEV_ANSWER.replace("focus_debt", "focus_other"), MediaType.APPLICATION_JSON)),
				Arguments.of("probability label outside the set",
						withSuccess(JEV_ANSWER.replace("\"advanced\": 0.1", "\"expert\": 0.1"),
								MediaType.APPLICATION_JSON)),
				Arguments.of("probabilities missing a label",
						withSuccess(JEV_ANSWER.replace(", \"advanced\": 0.1", ""), MediaType.APPLICATION_JSON)),
				Arguments.of("empty probabilities",
						withSuccess(JEV_ANSWER.replace("{\"novice\": 0.1, \"intermediate\": 0.8, \"advanced\": 0.1}", "{}"),
								MediaType.APPLICATION_JSON)),
				Arguments.of("choice is not the most likely label",
						withSuccess(JEV_ANSWER.replace("\"choice\": \"intermediate\"", "\"choice\": \"novice\""),
								MediaType.APPLICATION_JSON)),
				Arguments.of("negative probability",
						withSuccess(JEV_ANSWER.replace("\"noul\": 0.7", "\"noul\": -0.1"), MediaType.APPLICATION_JSON)),
				Arguments.of("empty body", withSuccess("", MediaType.APPLICATION_JSON)),
				Arguments.of("body is not JSON", withSuccess("not json", MediaType.APPLICATION_JSON)));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("brokenJev")
	void brokenJevFallsBackToRules(String name, ResponseCreator response) throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(response);

		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"bankData": true, "role": "intermediate", "lifeStage": "family",
					 "focusAreas": ["debt", "saving", "investing"],
					 "lessonVariant": {"persona": "family", "level": "beginner", "lang": "standard"},
					 "explanation": [{"output": "role", "probabilities": {}}, {"output": "focusAreas", "probabilities": {}}],
					 "sharedWithModel": {"facts": %s, "answers": %s},
					 "source": "fallback", "model": null}""".formatted(FACTS, ANSWERS)));
	}

	@Test
	void probabilityBoundsAreValid() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(JEV_ANSWER.replace("\"noul\": 0.9", "\"noul\": 1.0")
				.replace("\"noul\": 0.7", "\"noul\": 0.0"), MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.focusAreas[0]").value("investing"));
	}

	@Test
	void refusedConnectionSharesNothing() throws Exception {
		onboard("alex", ANSWERS);
		// The chain the JDK client really throws for a refused port.
		ConnectException refused = new ConnectException();
		refused.initCause(new ClosedChannelException());
		jev.expect(requestTo(JEV_URL)).andRespond(withException(refused));

		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("fallback"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.sharedWithModel").isEmpty());
	}

	@Test
	void withoutConsentNoFactsReachTheModel() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.answers.experience").value("occasional"))
			.andExpect(jsonPath("$.state.facts").doesNotExist())
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", "{\"consent\": false}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"consent": false, "bankData": false, "lifeStage": "family", "gaps": [],
					 "explanation": [{"output": "role", "because": ["You said: I save now and then."]},
					                 {"output": "focusAreas",
					                  "because": ["You said Investing is new to you.", "It fits the answers you gave."]}],
					 "sharedWithModel": {"facts": null}, "source": "jev"}""", JsonCompareMode.LENIENT));
	}

	@Test
	void consentWithoutFactsUsesNoBankData() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts").doesNotExist())
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"consent": true, "bankData": false, "gaps": [], "sharedWithModel": {"facts": null}}"""));
	}

	@Test
	void skippedOnboardingGivesNoLifeStage() throws Exception {
		onboard("alex", "{\"interests\": [], \"skipped\": true}");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.answers.skipped").value(true))
			.andExpect(jsonPath("$.state.interests").doesNotExist())
			.andRespond(withServerError());

		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"role": "novice", "lifeStage": null, "gaps": [],
					 "lessonVariant": {"persona": null, "level": "beginner", "lang": "plain"}}"""));
	}

	@Test
	void onlyAnAnswerWithAValueReachesJev() throws Exception {
		// What today's onboarding saves: interests, no life stage and no experience.
		onboard("alex", "{\"interests\": [\"berlin\"], \"skipped\": false}");
		jev.expect(requestTo(JEV_URL))
			.andExpect(content().json("""
					{"model": "jev-1.14.0", "state": {"interests": [%s]}, "questions": %s}"""
				.formatted(TestPool.interest("berlin"), SpecBlocks.read(json, SpecBlocks.F1, "jev-questions")), JsonCompareMode.STRICT))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", "{\"consent\": false}").andExpect(status().isOk());
	}

	@Test
	void withNoAnswerLeftThereIsNoAnswersKey() throws Exception {
		onboard("alex", "{\"interests\": [], \"skipped\": false}");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.answers").doesNotExist())
			.andExpect(jsonPath("$.state.facts.hasLoan").value(true))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(status().isOk());
	}

	@Test
	void rejectsBadRequests() throws Exception {
		onboard("alex", ANSWERS);
		categorize("alex", "{\"consent\": tru").andExpect(status().isBadRequest());
		categorize("alex", "{}").andExpect(status().isBadRequest());
		categorize("alex", "{\"consent\": null}").andExpect(status().isBadRequest());
		categorize(" ", "{\"consent\": true}").andExpect(status().isBadRequest());
		categorize("x".repeat(65), "{\"consent\": true}").andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/{id}/categorization", " ")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/{id}/categorization", "x".repeat(65))).andExpect(status().isBadRequest());
	}

	@Test
	void refusesFactsWithoutConsent() throws Exception {
		onboard("alex", ANSWERS);
		categorize("alex", "{\"consent\": false, \"facts\": " + FACTS + "}").andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/alex/categorization")).andExpect(status().isNotFound());
	}

	static Stream<Arguments> badFacts() {
		return Stream.of(
				Arguments.of("income outside the bands", FACTS.replace("\"2-3.5k\"", "\"2-4k\"")),
				Arguments.of("buffer outside the bands", FACTS.replace("\"6+\"", "\"6\"")),
				Arguments.of("savings rate outside the bands", FACTS.replace("\"20%+\"", "\"25%\"")),
				Arguments.of("missing fact", FACTS.replace(", \"hasLoan\": true", "")),
				Arguments.of("flag that is not a boolean", FACTS.replace("\"hasLoan\": true", "\"hasLoan\": \"maybe\"")),
				Arguments.of("exact amount instead of a band", FACTS.replace("\"2-3.5k\"", "\"2843.10\"")));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("badFacts")
	void rejectsFactsOutsideTheirValues(String name, String facts) throws Exception {
		onboard("alex", ANSWERS);
		categorize("alex", "{\"consent\": true, \"facts\": " + facts + "}").andExpect(status().isBadRequest());
	}

	@Test
	void longestValidIdIsAccepted() throws Exception {
		categorize("x".repeat(64), "{\"consent\": true}").andExpect(status().isNotFound());
	}

	@Test
	void secondPostReplacesTheStoredResult() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withServerError());
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(MockMvcResultMatchers.jsonPath("$.source").value("fallback"));
		categorize("alex", WITH_FACTS).andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"));
		mvc.perform(get("/api/users/alex/categorization"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.focusAreas[0]").value("investing"));
	}

	@Test
	void repeatedPostReusesARecentJevResult() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts.hasLoan").value(false))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts").doesNotExist())
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"));
		categorize("alex", WITH_FACTS).andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"));
		// Different facts or a different consent are a new question for the model.
		categorize("alex", WITH_FACTS.replace("\"hasLoan\": true", "\"hasLoan\": false")).andExpect(status().isOk());
		categorize("alex", "{\"consent\": false}").andExpect(MockMvcResultMatchers.jsonPath("$.bankData").value(false));
	}

	@Test
	void resetDuringTheJevCallIs404() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(request -> {
			jdbc.sql("UPDATE user_profile SET onboarding_completed = false WHERE user_id = 'alex'").update();
			return withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON).createResponse(request);
		});

		categorize("alex", WITH_FACTS).andExpect(status().isNotFound())
			.andExpect(MockMvcResultMatchers.jsonPath("$.detail").value("Finish onboarding first"));
	}

	@Test
	void modelIdThatIsNotAnIdIsDropped() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(
				JEV_ANSWER.replace("\"jev-2026-05\"", "\"<b>jev</b> latest\""), MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.model").isEmpty());
	}

	@Test
	void changedAnswersAreAskedAgain() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.answers.experience").value("regular"))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(status().isOk());
		mvc.perform(put("/api/users/alex/profile/onboarding").contentType(MediaType.APPLICATION_JSON)
			.content(ANSWERS.replace("\"occasional\"", "\"regular\"")))
			.andExpect(status().isOk());
		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.sharedWithModel.answers.experience").value("regular"));
	}

	@Test
	void reuseEndsWithTheWindow() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("alex", WITH_FACTS).andExpect(status().isOk());
		CLOCK.advance(CategorizationConsts.RECATEGORIZE_AFTER.plusSeconds(1));
		categorize("alex", WITH_FACTS).andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.categorizedAt").value(START.plus(CategorizationConsts.RECATEGORIZE_AFTER).plusSeconds(1).toString()));
	}

	@Test
	void unreadableStoredResultIs404() throws Exception {
		onboard("alex", ANSWERS);
		tx.execute(status -> categorizations.saveIfOnboarded("alex", "{\"role\": \"wizard\"}"));

		mvc.perform(get("/api/users/alex/categorization")).andExpect(status().isNotFound());
	}

	@Test
	void needsOnboardingFirst() throws Exception {
		categorize("nobody", "{\"consent\": true}").andExpect(status().isNotFound())
			.andExpect(MockMvcResultMatchers.jsonPath("$.detail").value("Finish onboarding first"));
	}

	@Test
	void getBeforePostIs404() throws Exception {
		onboard("fresh", "{\"interests\": [], \"skipped\": true}");
		mvc.perform(get("/api/users/fresh/categorization")).andExpect(status().isNotFound());
	}

	@Test
	void newOnboardingAnswersRemoveTheCategorisation() throws Exception {
		onboard("alex", ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		categorize("alex", WITH_FACTS).andExpect(status().isOk());

		mvc.perform(put("/api/users/alex/profile/onboarding").contentType(MediaType.APPLICATION_JSON)
			.content(ANSWERS.replace("\"occasional\"", "\"regular\"")))
			.andExpect(status().isOk());
		mvc.perform(get("/api/users/alex/categorization")).andExpect(status().isNotFound());
	}

	@Test
	void onboardingResetRemovesTheCategorisation() throws Exception {
		onboard("lena", "{\"interests\": [], \"skipped\": true}");
		jev.expect(requestTo(JEV_URL)).andRespond(withServerError());
		categorize("lena", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.sharedWithModel.answers.skipped").value(true));

		mvc.perform(delete("/api/users/lena/profile/onboarding")).andExpect(status().isNoContent());
		mvc.perform(get("/api/users/lena/categorization")).andExpect(status().isNotFound());
		categorize("lena", "{\"consent\": true}").andExpect(status().isNotFound())
			.andExpect(MockMvcResultMatchers.jsonPath("$.detail").value("Finish onboarding first"));
	}

}
