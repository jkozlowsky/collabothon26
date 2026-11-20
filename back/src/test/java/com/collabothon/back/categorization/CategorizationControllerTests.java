package com.collabothon.back.categorization;

import static org.assertj.core.api.Assertions.assertThat;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
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

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
class CategorizationControllerTests {

	private static final String JEV_URL = "https://api.typesafe.ai/v1/systemone";

	private static final String SPEC = "docs/specs/F1-profiling.md";

	private static final String TOM_ANSWERS = """
			{"lifeStage": null, "goals": ["start-investing", "etfs"], "experience": "none", "learningStyle": "visual",
			 "confidence": {"budgeting": 2, "saving": 3, "investing": 4}, "skipped": false}""";

	private static final String TOM_FACTS = """
			{"ageBand": "26-34", "incomeBand": "3.5-5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
			 "savesRegularly": false, "overdraftMonths": 0,
			 "holdsInvestments": false, "hasMortgage": false, "hasInsurance": false}""";

	private static final String JEV_ANSWER = """
			{"model": "jev-2026-05", "answers": {
			  "role": {"type": "choice", "choice": "intermediate", "confidence": 0.9,
			           "probabilities": {"novice": 0.06, "intermediate": 0.9, "advanced": 0.04}},
			  "lifeStage": {"type": "choice", "choice": "established", "confidence": 0.8,
			                "probabilities": {"student": 0.1, "established": 0.8, "family": 0.08, "pre-retirement": 0.02}},
			  "focus_saving": {"type": "noul", "noul": 0.2},
			  "focus_debt": {"type": "noul", "noul": 0.05},
			  "focus_investing": {"type": "noul", "noul": 0.9},
			  "focus_risk": {"type": "noul", "noul": 0.6},
			  "focus_retirement": {"type": "noul", "noul": 0.1}},
			 "usage": {"input_tokens": 510, "output_tokens": 12}}""";

	private static final Instant START = Instant.parse("2026-06-15T10:00:00Z");

	private static final MovableClock CLOCK = new MovableClock();

	@TestBean
	Clock clock;

	static Clock clock() {
		return CLOCK;
	}

	static final class MovableClock extends Clock {

		private final AtomicReference<Instant> now = new AtomicReference<>(START);

		void advance(Duration by) {
			now.updateAndGet(t -> t.plus(by));
		}

		void reset() {
			now.set(START);
		}

		@Override
		public ZoneId getZone() {
			return ZoneId.of("Europe/Berlin");
		}

		@Override
		public Clock withZone(ZoneId zone) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Instant instant() {
			return now.get();
		}

	}

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	@Autowired
	JdbcClient jdbc;

	// Boot resets the Jev stub after each test; the clock needs its own reset, before the test, so a failed
	// verify in an earlier test cannot leave it moved.
	@BeforeEach
	void resetClock() {
		CLOCK.reset();
	}

	@AfterEach
	void verifyJev() {
		jev.verify();
	}

	// The reset also drops any earlier categorisation, so each test starts without a reusable result.
	private void onboard(String userId, String answers) throws Exception {
		mvc.perform(delete("/api/users/{id}/profile", userId)).andExpect(status().isNoContent());
		mvc.perform(put("/api/users/{id}/profile", userId).contentType(MediaType.APPLICATION_JSON).content(answers))
			.andExpect(status().isOk());
	}

	private ResultActions categorize(String userId, String body) throws Exception {
		return mvc.perform(post("/api/users/{id}/categorization", userId).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	private static String specQuestions() throws Exception {
		Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
		while (!Files.exists(dir.resolve(SPEC))) {
			dir = dir.getParent();
			assertThat(dir).as("%s above the working directory", SPEC).isNotNull();
		}
		var block = Pattern.compile("<!-- jev-questions[^>]*-->\n```json\n(.*?)\n```", Pattern.DOTALL)
			.matcher(Files.readString(dir.resolve(SPEC)));
		assertThat(block.find()).isTrue();
		return block.group(1);
	}

	@Test
	void tomIsCategorisedByJev() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andExpect(method(HttpMethod.POST))
			.andExpect(header("Authorization", "Bearer test-key"))
			.andExpect(content().json("""
					{"model": "jev-latest", "state": {"answers": %s, "facts": %s}, "questions": %s}"""
				.formatted(TOM_ANSWERS, TOM_FACTS, specQuestions()), JsonCompareMode.STRICT))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		String expected = """
				{"userId": "tom", "consent": true, "bankData": true, "role": "intermediate", "lifeStage": "established",
				 "focusAreas": ["investing", "risk"],
				 "confidenceGaps": [
				   {"area": "budgeting", "direction": "under",
				    "because": "You rate yourself 2/5 on everyday money, and your current account stayed above zero in the last 3 months while you kept more than 20%% of your income."},
				   {"area": "investing", "direction": "over",
				    "because": "You rate yourself 4/5 on investing, and there are no investment products in your accounts with us."}],
				 "lessonVariant": {"persona": null, "level": "beginner", "lang": "standard"},
				 "explanation": [
				   {"output": "role", "probabilities": {"novice": 0.06, "intermediate": 0.9, "advanced": 0.04},
				    "because": ["You said: I save, but don't invest yet.",
				                "You rate yourself 2/5 on everyday money, 3/5 on saving, 4/5 on investing.",
				                "No regular transfers to savings in the last 3 months.",
				                "No investment products in your accounts with us."]},
				   {"output": "lifeStage",
				    "probabilities": {"student": 0.1, "established": 0.8, "family": 0.08, "pre-retirement": 0.02},
				    "because": ["Age group 26-34."]},
				   {"output": "focusAreas",
				    "probabilities": {"saving": 0.2, "debt": 0.05, "investing": 0.9, "risk": 0.6, "retirement": 0.1},
				    "because": ["No investment products in your accounts with us.",
				                "Your accounts cover more than 6 months of spending.", "You picked investing as a goal.",
				                "It fits the answers you gave."]}],
				 "sharedWithModel": {"facts": %s, "answers": %s},
				 "source": "jev", "model": "jev-2026-05", "categorizedAt": "2026-06-15T10:00:00Z"}"""
			.formatted(TOM_FACTS, TOM_ANSWERS);

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json(expected, JsonCompareMode.STRICT));
		mvc.perform(get("/api/users/tom/categorization"))
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
				Arguments.of("asked life stage missing",
						withSuccess(JEV_ANSWER.replace("\"lifeStage\"", "\"lifeStage_x\""), MediaType.APPLICATION_JSON)),
				Arguments.of("probability label outside the set",
						withSuccess(JEV_ANSWER.replace("\"advanced\": 0.04", "\"expert\": 0.04"),
								MediaType.APPLICATION_JSON)),
				Arguments.of("probabilities missing a label",
						withSuccess(JEV_ANSWER.replace(", \"advanced\": 0.04", ""), MediaType.APPLICATION_JSON)),
				Arguments.of("empty probabilities",
						withSuccess(JEV_ANSWER.replace("{\"novice\": 0.06, \"intermediate\": 0.9, \"advanced\": 0.04}", "{}"),
								MediaType.APPLICATION_JSON)),
				Arguments.of("choice is not the most likely label",
						withSuccess(JEV_ANSWER.replace("\"choice\": \"intermediate\"", "\"choice\": \"novice\""),
								MediaType.APPLICATION_JSON)),
				Arguments.of("negative probability",
						withSuccess(JEV_ANSWER.replace("\"noul\": 0.05", "\"noul\": -0.1"), MediaType.APPLICATION_JSON)),
				Arguments.of("empty body", withSuccess("", MediaType.APPLICATION_JSON)),
				Arguments.of("body is not JSON", withSuccess("not json", MediaType.APPLICATION_JSON)));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("brokenJev")
	void brokenJevFallsBackToRules(String name, ResponseCreator response) throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(response);

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"bankData": true, "role": "novice", "lifeStage": "established", "focusAreas": ["investing", "risk"],
					 "lessonVariant": {"persona": null, "level": "beginner", "lang": "plain"},
					 "explanation": [{"output": "role", "probabilities": {}}, {"output": "lifeStage", "probabilities": {}},
					                 {"output": "focusAreas", "probabilities": {}}],
					 "sharedWithModel": {"facts": %s, "answers": %s},
					 "source": "fallback", "model": null}""".formatted(TOM_FACTS, TOM_ANSWERS)));
	}

	@Test
	void probabilityBoundsAreValid() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andRespond(withSuccess(JEV_ANSWER.replace("\"noul\": 0.9", "\"noul\": 1.0")
				.replace("\"noul\": 0.05", "\"noul\": 0.0"), MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.focusAreas[0]").value("investing"));
	}

	@Test
	void refusedConnectionSharesNothing() throws Exception {
		onboard("tom", TOM_ANSWERS);
		// The chain the JDK client really throws for a refused port.
		ConnectException refused = new ConnectException();
		refused.initCause(new ClosedChannelException());
		jev.expect(requestTo(JEV_URL)).andRespond(withException(refused));

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("fallback"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.sharedWithModel").isEmpty());
	}

	@Test
	void withoutConsentNoFactsReachTheModel() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.answers.experience").value("none"))
			.andExpect(jsonPath("$.state.facts").doesNotExist())
			.andExpect(jsonPath("$.questions.lifeStage").doesNotExist())
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": false}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"consent": false, "bankData": false, "lifeStage": null, "confidenceGaps": [],
					 "explanation": [{"output": "role"}, {"output": "focusAreas",
					                  "because": ["You picked investing as a goal.", "It fits the answers you gave."]}],
					 "sharedWithModel": {"facts": null}, "source": "jev"}""", JsonCompareMode.LENIENT))
			.andExpect(MockMvcResultMatchers.jsonPath("$.explanation.length()").value(2));
	}

	@Test
	void demoUserIsNotABankCustomer() throws Exception {
		onboard("demo-user", """
				{"lifeStage": "student", "goals": ["budget"], "experience": "not-saving", "learningStyle": "simple",
				 "confidence": {"budgeting": 1}, "skipped": false}""");
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts").doesNotExist())
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("demo-user", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.content().json("""
					{"consent": true, "bankData": false, "lifeStage": "student", "confidenceGaps": [],
					 "lessonVariant": {"persona": "student", "level": "beginner", "lang": "plain"}}"""));
	}

	@Test
	void rejectsBadRequests() throws Exception {
		onboard("tom", TOM_ANSWERS);
		categorize("tom", "{\"consent\": tru").andExpect(status().isBadRequest());
		categorize("tom", "{}").andExpect(status().isBadRequest());
		categorize("tom", "{\"consent\": null}").andExpect(status().isBadRequest());
		categorize(" ", "{\"consent\": true}").andExpect(status().isBadRequest());
		categorize("x".repeat(65), "{\"consent\": true}").andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/{id}/categorization", " ")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/{id}/categorization", "x".repeat(65))).andExpect(status().isBadRequest());
	}

	@Test
	void longestValidIdIsAccepted() throws Exception {
		categorize("x".repeat(64), "{\"consent\": true}").andExpect(status().isNotFound());
	}

	@Test
	void answeredLifeStageWins() throws Exception {
		onboard("tom", TOM_ANSWERS.replace("\"lifeStage\": null", "\"lifeStage\": \"family\""));
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.facts").exists())
			.andExpect(jsonPath("$.questions.lifeStage").doesNotExist())
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.lifeStage").value("family"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.lessonVariant.persona").value("family"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.explanation.length()").value(2));
	}

	@Test
	void secondPostReplacesTheStoredResult() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withServerError());
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(MockMvcResultMatchers.jsonPath("$.source").value("fallback"));
		categorize("tom", "{\"consent\": true}").andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"));
		mvc.perform(get("/api/users/tom/categorization"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.role").value("intermediate"));
	}

	@Test
	void repeatedPostReusesARecentJevResult() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"));
		categorize("tom", "{\"consent\": true}").andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"));
		// A different consent is a new question for the model.
		categorize("tom", "{\"consent\": false}").andExpect(MockMvcResultMatchers.jsonPath("$.bankData").value(false));
	}

	@Test
	void resetDuringTheJevCallIs404() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(request -> {
			jdbc.sql("DELETE FROM user_profile WHERE user_id = 'tom'").update();
			return withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON).createResponse(request);
		});

		categorize("tom", "{\"consent\": true}").andExpect(status().isNotFound())
			.andExpect(MockMvcResultMatchers.jsonPath("$.detail").value("Finish onboarding first"));
	}

	@Test
	void modelIdThatIsNotAnIdIsDropped() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(
				JEV_ANSWER.replace("\"jev-2026-05\"", "\"<b>jev</b> latest\""), MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.source").value("jev"))
			.andExpect(MockMvcResultMatchers.jsonPath("$.model").isEmpty());
	}

	@Test
	void changedAnswersAreAskedAgain() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL))
			.andExpect(jsonPath("$.state.answers.experience").value("tried"))
			.andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk());
		mvc.perform(put("/api/users/tom/profile").contentType(MediaType.APPLICATION_JSON)
			.content(TOM_ANSWERS.replace("\"experience\": \"none\"", "\"experience\": \"tried\"")))
			.andExpect(status().isOk());
		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.sharedWithModel.answers.experience").value("tried"));
	}

	@Test
	void reuseEndsWithTheWindow() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));
		jev.expect(requestTo(JEV_URL)).andRespond(withSuccess(JEV_ANSWER, MediaType.APPLICATION_JSON));

		categorize("tom", "{\"consent\": true}").andExpect(status().isOk());
		CLOCK.advance(CategorizationService.RECATEGORIZE_AFTER.plusSeconds(1));
		categorize("tom", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.categorizedAt").value(START.plus(CategorizationService.RECATEGORIZE_AFTER).plusSeconds(1).toString()));
	}

	@Test
	void unreadableStoredResultIs404() throws Exception {
		onboard("tom", TOM_ANSWERS);
		jdbc.sql("INSERT INTO categorization (user_id, data) VALUES ('tom', '{\"role\": \"wizard\"}'::jsonb)").update();

		mvc.perform(get("/api/users/tom/categorization")).andExpect(status().isNotFound());
	}

	@Test
	void needsOnboardingFirst() throws Exception {
		categorize("nobody", "{\"consent\": true}").andExpect(status().isNotFound())
			.andExpect(MockMvcResultMatchers.jsonPath("$.detail").value("Finish onboarding first"));
	}

	@Test
	void getBeforePostIs404() throws Exception {
		onboard("fresh", "{\"goals\": [], \"skipped\": true}");
		mvc.perform(get("/api/users/fresh/categorization")).andExpect(status().isNotFound());
	}

	@Test
	void profileResetRemovesTheCategorisation() throws Exception {
		onboard("lena", "{\"goals\": [], \"skipped\": true}");
		jev.expect(requestTo(JEV_URL)).andRespond(withServerError());
		categorize("lena", "{\"consent\": true}").andExpect(status().isOk())
			.andExpect(MockMvcResultMatchers.jsonPath("$.sharedWithModel.answers.skipped").value(true));

		mvc.perform(delete("/api/users/lena/profile")).andExpect(status().isNoContent());
		mvc.perform(get("/api/users/lena/categorization")).andExpect(status().isNotFound());
	}

}
