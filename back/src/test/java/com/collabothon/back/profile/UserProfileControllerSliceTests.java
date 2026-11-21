package com.collabothon.back.profile;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.dto.profile.ProfileDto;
import com.collabothon.back.profile.controllers.UserProfileController;
import com.collabothon.back.profile.services.UserProfileService;

@WebMvcTest(UserProfileController.class)
class UserProfileControllerSliceTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private UserProfileService userProfileService;

	@Test
	void getProfileReturnsOkWithProfileDto() throws Exception {
		when(userProfileService.getProfile("u456"))
				.thenReturn(new ProfileDto("u456", "starting-out", List.of("budget"), "not-saving", true, false, null));

		mvc.perform(get("/api/users/u456/profile"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("u456"))
				.andExpect(jsonPath("$.lifeStage").value("starting-out"))
				.andExpect(jsonPath("$.onboardingCompleted").value(true));
	}
}
