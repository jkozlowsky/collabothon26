package com.collabothon.back.lesson;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.common.consts.TimeConsts;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class LessonResultValidationTests {

	// Already 22 November in Berlin, still the 21st in UTC: tomorrow in UTC is the 22nd.
	@TestBean
	Clock clock;

	static Clock clock() {
		return Clock.fixed(Instant.parse("2026-11-21T23:30:00Z"), TimeConsts.ZONE);
	}

	@Autowired
	MockMvc mvc;

	private final String userId = UUID.randomUUID().toString();

	private ResultActions result(String body) throws Exception {
		return mvc.perform(post("/api/lessons/seoul-1/result").param("userId", userId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	@Test
	void nullStepIsRejected() throws Exception {
		result("{\"mode\":\"classic\",\"steps\":[null]}").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Validation failure"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "2026-11-22", "2026-11-21", "0001-01-01" })
	void completedOnUpToTomorrowInUtcIsRecorded(String date) throws Exception {
		result("{\"mode\":\"classic\",\"steps\":[],\"completedOn\":\"" + date + "\"}").andExpect(status().isOk());

		mvc.perform(get("/api/users/{userId}/stats", userId).param("today", date))
			.andExpect(jsonPath("$.doneToday").value(true));
	}

	@Test
	void completedOnIsOptional() throws Exception {
		result("{\"mode\":\"classic\",\"steps\":[],\"completedOn\":null}").andExpect(status().isOk());

		mvc.perform(get("/api/users/{userId}/stats", userId).param("today", "2026-11-21"))
			.andExpect(jsonPath("$.doneToday").value(true));
	}

	@ParameterizedTest
	@ValueSource(strings = { "2026-11-23", "0000-12-31", "+999999999-12-31", "-999999999-01-01" })
	void completedOnOutsideTheRangeIsRejected(String date) throws Exception {
		result("{\"mode\":\"classic\",\"steps\":[],\"completedOn\":\"" + date + "\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Validation failure"));
	}

}
