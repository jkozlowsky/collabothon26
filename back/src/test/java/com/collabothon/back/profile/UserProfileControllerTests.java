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
import org.springframework.test.web.servlet.ResultActions;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class UserProfileControllerTests {

	@Autowired
	MockMvc mvc;

	ResultActions saveOnboarding(String userId, String json) throws Exception {
		return mvc.perform(
				put("/api/users/" + userId + "/profile/onboarding").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	@Test
	void newUserHasAnEmptyProfileWithOnboardingNotCompleted() throws Exception {
		mvc.perform(get("/api/users/nobody/profile"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.userId").value("nobody"))
			.andExpect(jsonPath("$.onboardingCompleted").value(false))
			.andExpect(jsonPath("$.goals.length()").value(0));
	}

	@Test
	void savingOnboardingStoresAnswersPerUserAndMarksItCompleted() throws Exception {
		saveOnboarding("anna", """
				{"lifeStage":"building","goals":["budget","start-saving","stocks-etfs","scams"],
				 "experience":"not-saving","skipped":false}
				""").andExpect(status().isOk()).andExpect(jsonPath("$.onboardingCompleted").value(true));
		saveOnboarding("ben", "{\"goals\":[],\"skipped\":true}").andExpect(status().isOk());

		mvc.perform(get("/api/users/anna/profile"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.onboardingCompleted").value(true))
			.andExpect(jsonPath("$.lifeStage").value("building"))
			.andExpect(jsonPath("$.goals.length()").value(4))
			.andExpect(jsonPath("$.experience").value("not-saving"))
			.andExpect(jsonPath("$.onboardingSkipped").value(false));
		mvc.perform(get("/api/users/ben/profile"))
			.andExpect(jsonPath("$.onboardingCompleted").value(true))
			.andExpect(jsonPath("$.onboardingSkipped").value(true))
			.andExpect(jsonPath("$.lifeStage").doesNotExist());
	}

	@Test
	void rejectsUnknownAnswerValues() throws Exception {
		saveOnboarding("cara", "{\"goals\":[\"get-rich\"],\"experience\":\"guru\",\"skipped\":false}")
			.andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/cara/profile")).andExpect(jsonPath("$.onboardingCompleted").value(false));
	}

	@Test
	void resetClearsAnswersAndTheFlag() throws Exception {
		saveOnboarding("dan", "{\"lifeStage\":\"starting-out\",\"goals\":[\"budget\"],\"skipped\":false}")
			.andExpect(status().isOk());
		mvc.perform(delete("/api/users/dan/profile/onboarding")).andExpect(status().isNoContent());
		mvc.perform(get("/api/users/dan/profile"))
			.andExpect(jsonPath("$.onboardingCompleted").value(false))
			.andExpect(jsonPath("$.lifeStage").doesNotExist())
			.andExpect(jsonPath("$.goals.length()").value(0));
	}

	@Test
	void resettingAUserWithoutAProfileIsANoOp() throws Exception {
		mvc.perform(delete("/api/users/eve/profile/onboarding")).andExpect(status().isNoContent());
	}

}
