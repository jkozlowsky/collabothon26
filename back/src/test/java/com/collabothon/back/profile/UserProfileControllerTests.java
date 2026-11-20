package com.collabothon.back.profile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class UserProfileControllerTests {

	@Autowired
	MockMvc mvc;

	@Test
	void unknownUserHasNoProfile() throws Exception {
		mvc.perform(get("/api/users/nobody/profile")).andExpect(status().isNotFound());
	}

	@Test
	void savesOnboardingAnswersPerUser() throws Exception {
		mvc.perform(put("/api/users/anna/profile").contentType(MediaType.APPLICATION_JSON).content("""
				{"lifeStage":"family","goals":["budget","start-saving","etfs","taxes"],
				 "experience":"not-saving","learningStyle":"simple","confidence":{"budgeting":2,"saving":3,"investing":1},"skipped":false}
				"""))
			.andExpect(status().isOk());
		mvc.perform(put("/api/users/ben/profile").contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\":[],\"skipped\":true}")).andExpect(status().isOk());

		mvc.perform(get("/api/users/anna/profile"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.lifeStage").value("family"))
			.andExpect(jsonPath("$.goals.length()").value(4))
			.andExpect(jsonPath("$.confidence.budgeting").value(2))
			.andExpect(jsonPath("$.confidence.saving").value(3))
			.andExpect(jsonPath("$.confidence.investing").value(1))
			.andExpect(jsonPath("$.onboardingSkipped").value(false));
		mvc.perform(get("/api/users/ben/profile"))
			.andExpect(jsonPath("$.onboardingSkipped").value(true))
			.andExpect(jsonPath("$.lifeStage").doesNotExist());
	}

	@Test
	void rejectsUnknownAnswerValues() throws Exception {
		mvc.perform(put("/api/users/cara/profile").contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\":[\"get-rich\"],\"confidence\":{\"saving\":9},\"skipped\":false}"))
			.andExpect(status().isBadRequest());
	}

	@Test
	void resetForgetsTheProfile() throws Exception {
		mvc.perform(put("/api/users/dan/profile").contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\":[],\"skipped\":true}")).andExpect(status().isOk());
		mvc.perform(delete("/api/users/dan/profile")).andExpect(status().isNoContent());
		mvc.perform(get("/api/users/dan/profile")).andExpect(status().isNotFound());
	}

}
