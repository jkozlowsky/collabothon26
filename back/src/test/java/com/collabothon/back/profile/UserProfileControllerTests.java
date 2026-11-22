package com.collabothon.back.profile;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;

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
			.andExpect(jsonPath("$.interests.length()").value(0));
	}

	@Test
	void savingOnboardingStoresAnswersPerUserAndMarksItCompleted() throws Exception {
		saveOnboarding("anna", """
				{"lifeStage":"building","interests":["tokyo","berlin","tokyo","mumbai"],
				 "experience":"not-saving","skipped":false}
				""").andExpect(status().isOk()).andExpect(jsonPath("$.onboardingCompleted").value(true));
		saveOnboarding("ben", "{\"interests\":[],\"skipped\":true}").andExpect(status().isOk());

		mvc.perform(get("/api/users/anna/profile"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.onboardingCompleted").value(true))
			.andExpect(jsonPath("$.lifeStage").value("building"))
			.andExpect(jsonPath("$.interests.length()").value(3))
			.andExpect(jsonPath("$.interests[0]").value("tokyo"))
			.andExpect(jsonPath("$.interests[1]").value("berlin"))
			.andExpect(jsonPath("$.interests[2]").value("mumbai"))
			.andExpect(jsonPath("$.experience").value("not-saving"))
			.andExpect(jsonPath("$.onboardingSkipped").value(false));
		mvc.perform(get("/api/users/ben/profile"))
			.andExpect(jsonPath("$.onboardingCompleted").value(true))
			.andExpect(jsonPath("$.onboardingSkipped").value(true))
			.andExpect(jsonPath("$.lifeStage").doesNotExist());
	}

	@Test
	void rejectsUnknownAnswerValues() throws Exception {
		saveOnboarding("cara", "{\"interests\":[\"berlin\"],\"experience\":\"guru\",\"skipped\":false}")
			.andExpect(status().isBadRequest());
		mvc.perform(get("/api/users/cara/profile")).andExpect(jsonPath("$.onboardingCompleted").value(false));
	}

	@Test
	void anInterestThatIsNoStoryIs400WithoutEchoingItOrStoringAnything() throws Exception {
		String response = saveOnboarding("finn", "{\"interests\":[\"berlin\",\"get-rich\"],\"skipped\":false}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("UNKNOWN_INTEREST"))
			.andReturn()
			.getResponse()
			.getContentAsString();

		assertFalse(response.contains("get-rich"), response);
		mvc.perform(get("/api/users/finn/profile")).andExpect(jsonPath("$.onboardingCompleted").value(false));
	}

	@Test
	void atMost32InterestsAreAccepted() throws Exception {
		saveOnboarding("gus", interests(32)).andExpect(status().isOk());
		saveOnboarding("hana", interests(33)).andExpect(status().isBadRequest());
	}

	private static String interests(int count) {
		return "{\"interests\":[%s],\"skipped\":false}"
			.formatted(String.join(",", Collections.nCopies(count, "\"berlin\"")));
	}

	@Test
	void resetClearsAnswersAndTheFlag() throws Exception {
		saveOnboarding("dan", "{\"lifeStage\":\"starting-out\",\"interests\":[\"berlin\"],\"skipped\":false}")
			.andExpect(status().isOk());
		mvc.perform(delete("/api/users/dan/profile/onboarding")).andExpect(status().isNoContent());
		mvc.perform(get("/api/users/dan/profile"))
			.andExpect(jsonPath("$.onboardingCompleted").value(false))
			.andExpect(jsonPath("$.lifeStage").doesNotExist())
			.andExpect(jsonPath("$.interests.length()").value(0));
	}

	@Test
	void resettingAUserWithoutAProfileIsANoOp() throws Exception {
		mvc.perform(delete("/api/users/eve/profile/onboarding")).andExpect(status().isNoContent());
	}

}
