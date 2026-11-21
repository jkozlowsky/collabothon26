package com.collabothon.back.profile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AccountControllerTests {

	@Autowired
	MockMvc mvc;

	ResultActions complete(String userId, String lessonId, String date) throws Exception {
		return mvc.perform(post("/api/lessons/" + lessonId + "/result").param("userId", userId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[],\"mode\":\"classic\",\"completedOn\":\"" + date + "\"}"));
	}

	@Test
	void demoUserHasASeededAccountAndCanChangeTheAvatar() throws Exception {
		mvc.perform(get("/api/users/demo-user/account"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.firstName").value("Alex"))
			.andExpect(jsonPath("$.lastName").value("Krause"));

		mvc.perform(patch("/api/users/demo-user/account").contentType(MediaType.APPLICATION_JSON)
			.content("{\"avatar\":\"f2\"}")).andExpect(jsonPath("$.avatar").value("f2"));
		mvc.perform(patch("/api/users/demo-user/account").contentType(MediaType.APPLICATION_JSON)
			.content("{\"avatar\":\"x9\"}")).andExpect(status().isBadRequest());
		mvc.perform(patch("/api/users/demo-user/account").contentType(MediaType.APPLICATION_JSON)
			.content("{\"avatar\":\"m1\"}")).andExpect(status().isOk());
	}

	@Test
	void unknownCustomerHasNoAccount() throws Exception {
		mvc.perform(get("/api/users/nobody/account")).andExpect(status().isNotFound());
	}

	@Test
	void repeatingALessonKeepsTheStreakButEarnsXpOnce() throws Exception {
		complete("cleo", "seoul-1", "2026-11-18").andExpect(jsonPath("$.totalXp").value(50));
		complete("cleo", "seoul-1", "2026-11-19").andExpect(jsonPath("$.xpAwarded").value(0));
		mvc.perform(get("/api/users/cleo/stats").param("today", "2026-11-19"))
			.andExpect(jsonPath("$.currentStreak").value(2))
			.andExpect(jsonPath("$.doneToday").value(true))
			.andExpect(jsonPath("$.totalXp").value(50))
			.andExpect(jsonPath("$.lessonsCompleted").value(1));

		mvc.perform(get("/api/users/cleo/stats").param("today", "2026-11-21"))
			.andExpect(jsonPath("$.currentStreak").value(0))
			.andExpect(jsonPath("$.longestStreak").value(2));
	}

	@Test
	void unknownLessonIsRejected() throws Exception {
		complete("cleo", "missing", "2026-11-19").andExpect(status().isNotFound());
	}

	@Test
	void resetStartsAFreshAccountWithNoStreak() throws Exception {
		complete("dora", "seoul-1", "2026-11-19");
		mvc.perform(post("/api/users/dora/progress/reset").param("today", "2026-11-20"))
			.andExpect(jsonPath("$.currentStreak").value(0))
			.andExpect(jsonPath("$.doneToday").value(false))
			.andExpect(jsonPath("$.longestStreak").value(0))
			.andExpect(jsonPath("$.lessonsCompleted").value(0));
	}

}
