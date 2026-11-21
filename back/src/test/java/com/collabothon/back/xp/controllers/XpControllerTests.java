package com.collabothon.back.xp.controllers;

import static org.mockito.Mockito.verifyNoInteractions;
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

import com.collabothon.back.dto.xp.CategoryXpDto;
import com.collabothon.back.xp.services.XpService;

@WebMvcTest(XpController.class)
class XpControllerTests {

	@Autowired
	MockMvc mvc;

	@MockitoBean
	XpService xpService;

	@Test
	void categoriesReturnsTheBreakdown() throws Exception {
		when(xpService.categoryBreakdown("u1")).thenReturn(List.of(new CategoryXpDto("berlin", 50, 3, 4, 25, 10)));

		mvc.perform(get("/api/xp/u1/categories"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].category").value("berlin"))
			.andExpect(jsonPath("$[0].xp").value(50))
			.andExpect(jsonPath("$[0].level").value(3))
			.andExpect(jsonPath("$[0].xpIntoLevel").value(4))
			.andExpect(jsonPath("$[0].xpForLevel").value(25))
			.andExpect(jsonPath("$[0].weeklyXp").value(10));
	}

	@Test
	void rejectsUserIdsLongerThanTheColumn() throws Exception {
		mvc.perform(get("/api/xp/" + "u".repeat(65) + "/categories")).andExpect(status().isBadRequest());

		verifyNoInteractions(xpService);
	}

}
