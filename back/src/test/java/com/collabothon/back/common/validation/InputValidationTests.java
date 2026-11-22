package com.collabothon.back.common.validation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Stream;

import org.junit.jupiter.api.Named;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class InputValidationTests {

	private static final String NUL = "a\0b";

	private static final String RESULT = "{\"mode\":\"classic\",\"steps\":[]}";

	@Autowired
	MockMvc mvc;

	@Test
	void slugIsLimitedToItsColumn() throws Exception {
		String longest = "s".repeat(60);
		String tooLong = longest + "s";
		mvc.perform(get("/api/glossary/terms/{slug}", longest)).andExpect(status().isNotFound());
		mvc.perform(get("/api/glossary/terms/{slug}", tooLong)).andExpect(status().isBadRequest());
		mvc.perform(put("/api/users/u1/glossary/favorites/{slug}", longest)).andExpect(status().isNotFound());
		mvc.perform(put("/api/users/u1/glossary/favorites/{slug}", tooLong)).andExpect(status().isBadRequest());
		mvc.perform(delete("/api/users/u1/glossary/favorites/{slug}", longest)).andExpect(status().isNoContent());
		mvc.perform(delete("/api/users/u1/glossary/favorites/{slug}", tooLong)).andExpect(status().isBadRequest());
	}

	@Test
	void lessonIdIsLimitedToItsColumn() throws Exception {
		String longest = "l".repeat(64);
		String tooLong = longest + "l";
		mvc.perform(get("/api/lessons/{id}", longest)).andExpect(status().isNotFound());
		mvc.perform(get("/api/lessons/{id}", tooLong)).andExpect(status().isBadRequest());
		mvc.perform(post("/api/lessons/{id}/result", longest).param("userId", "u1")
			.contentType(MediaType.APPLICATION_JSON).content(RESULT)).andExpect(status().isNotFound());
		mvc.perform(post("/api/lessons/{id}/result", tooLong).param("userId", "u1")
			.contentType(MediaType.APPLICATION_JSON).content(RESULT)).andExpect(status().isBadRequest());
	}

	@Test
	void optionalUserIdIsLimitedAndMayBeEmpty() throws Exception {
		for (String path : new String[] { "/api/stories", "/api/lessons", "/api/lessons/seoul-1" }) {
			mvc.perform(get(path)).andExpect(status().isOk());
			mvc.perform(get(path).param("userId", "")).andExpect(status().isOk());
			mvc.perform(get(path).param("userId", "u".repeat(64))).andExpect(status().isOk());
			mvc.perform(get(path).param("userId", "u".repeat(65))).andExpect(status().isBadRequest());
		}
	}

	// Postgres text cannot hold a NUL.
	static Stream<Named<RequestBuilder>> requestsWithANul() {
		return Stream.of(
				Named.of("account", get("/api/users/{id}/account", NUL)),
				Named.of("avatar", json(patch("/api/users/{id}/account", NUL), "{\"avatar\":\"m1\"}")),
				Named.of("stats", get("/api/users/{id}/stats", NUL).param("today", "2026-11-21")),
				Named.of("reset", post("/api/users/{id}/progress/reset", NUL).param("today", "2026-11-21")),
				Named.of("profile", get("/api/users/{id}/profile", NUL)),
				Named.of("onboarding",
						json(put("/api/users/{id}/profile/onboarding", NUL), "{\"interests\":[],\"skipped\":true}")),
				Named.of("onboarding reset", delete("/api/users/{id}/profile/onboarding", NUL)),
				Named.of("lesson mode", json(put("/api/users/{id}/lesson-mode", NUL), "{\"mode\":\"video\"}")),
				Named.of("session", json(post("/api/users/{id}/session", NUL), "{\"deviceId\":\"d\"}")),
				Named.of("heartbeat", json(put("/api/users/{id}/session", NUL), "{\"deviceId\":\"d\"}")),
				Named.of("session release", delete("/api/users/{id}/session", NUL).param("deviceId", "d")),
				Named.of("favorites", get("/api/users/{id}/glossary/favorites", NUL)),
				Named.of("favorite user", put("/api/users/{id}/glossary/favorites/risk", NUL)),
				Named.of("favorite removal user", delete("/api/users/{id}/glossary/favorites/risk", NUL)),
				Named.of("categorization", get("/api/users/{id}/categorization", NUL)),
				Named.of("categorize", json(post("/api/users/{id}/categorization", NUL), "{\"consent\":false}")),
				Named.of("quick check",
						json(post("/api/users/{id}/quick-check/step", NUL),
								"{\"consent\":false,\"history\":[],\"useRules\":true}")),
				Named.of("xp", get("/api/xp/{id}/categories", NUL)),
				Named.of("term", get("/api/glossary/terms/{slug}", NUL)),
				Named.of("favorite slug", put("/api/users/u1/glossary/favorites/{slug}", NUL)),
				Named.of("favorite removal slug", delete("/api/users/u1/glossary/favorites/{slug}", NUL)),
				Named.of("search", get("/api/glossary/search").param("q", NUL)),
				Named.of("stories", get("/api/stories").param("userId", NUL)),
				Named.of("lessons", get("/api/lessons").param("userId", NUL)),
				Named.of("lesson", get("/api/lessons/seoul-1").param("userId", NUL)),
				Named.of("lesson result", json(post("/api/lessons/seoul-1/result").param("userId", NUL), RESULT)),
				Named.of("duel categories", get("/api/duel/categories").param("userId", NUL)),
				Named.of("rankings", get("/api/duel/rankings").param("userId", NUL)),
				Named.of("duel history", get("/api/duel/matches").param("userId", NUL)),
				Named.of("duel state", get("/api/duel/matches/1/state").param("userId", NUL)),
				Named.of("duel result", get("/api/duel/matches/1").param("userId", NUL)),
				Named.of("duel start body",
						json(post("/api/duel/matches"),
								"{\"userId\":\"a\\u0000b\",\"mode\":\"SOLO\",\"categories\":[\"saving\"]}")),
				Named.of("duel answer body",
						json(post("/api/duel/matches/1/answers"), "{\"userId\":\"a\\u0000b\",\"index\":0}")),
				Named.of("session body", json(post("/api/users/demo-user/session"), "{\"deviceId\":\"a\\u0000b\"}")),
				Named.of("heartbeat body", json(put("/api/users/demo-user/session"), "{\"deviceId\":\"a\\u0000b\"}")),
				Named.of("session release query", delete("/api/users/demo-user/session").param("deviceId", NUL)),
				Named.of("category, checked against content",
						json(post("/api/duel/matches"),
								"{\"userId\":\"u1\",\"mode\":\"SOLO\",\"categories\":[\"a\\u0000b\"]}")),
				Named.of("interest, checked against content",
						json(put("/api/users/u1/profile/onboarding"),
								"{\"interests\":[\"a\\u0000b\"],\"skipped\":false}")),
				Named.of("step, checked against content",
						json(post("/api/lessons/seoul-1/result").param("userId", "u1"),
								"{\"mode\":\"classic\","
										+ "\"steps\":[{\"stepId\":\"a\\u0000b\",\"correctFirstTry\":true}]}")),
				Named.of("scenario, checked against content",
						json(post("/api/lessons/seoul-1/result").param("userId", "u1"),
								"{\"mode\":\"classic\",\"steps\":[],\"scenarioChoices\":{\"a\\u0000b\":0}}")));
	}

	@ParameterizedTest
	@MethodSource("requestsWithANul")
	void nulIsABadRequest(RequestBuilder request) throws Exception {
		mvc.perform(request).andExpect(status().isBadRequest());
	}

	private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
		return request.contentType(MediaType.APPLICATION_JSON).content(body);
	}

}
