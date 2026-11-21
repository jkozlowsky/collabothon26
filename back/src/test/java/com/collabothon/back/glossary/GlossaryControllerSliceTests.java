package com.collabothon.back.glossary;

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

import com.collabothon.back.dto.glossary.CategoryDto;
import com.collabothon.back.dto.glossary.TermSummary;
import com.collabothon.back.glossary.controllers.GlossaryController;
import com.collabothon.back.glossary.services.GlossaryService;

@WebMvcTest(GlossaryController.class)
class GlossaryControllerSliceTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private GlossaryService glossaryService;

	@Test
	void listCategoriesReturnsOk() throws Exception {
		CategoryDto cat = new CategoryDto("basics", "Podstawy",
				List.of(new TermSummary("inflation", "Inflacja", "Wzrost cen")));
		when(glossaryService.getCategories()).thenReturn(List.of(cat));

		mvc.perform(get("/api/glossary"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].slug").value("basics"))
				.andExpect(jsonPath("$[0].name").value("Podstawy"))
				.andExpect(jsonPath("$[0].terms[0].slug").value("inflation"));
	}
}
