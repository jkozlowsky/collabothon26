package com.collabothon.back.glossary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class GlossaryControllerTests {

	@Autowired
	MockMvc mvc;

	@Test
	void listsCategoriesInOrderWithTheirTerms() throws Exception {
		mvc.perform(get("/api/glossary"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].slug").value("basics"))
			.andExpect(jsonPath("$[0].terms[0].slug").value("inflation"))
			.andExpect(jsonPath("$[0].terms[0].shortDescription").isNotEmpty())
			.andExpect(jsonPath("$[1].slug").value("investing"))
			.andExpect(jsonPath("$[1].terms[1].name").value("ETF"));
	}

	@Test
	void returnsTermDetailWithRelatedTermsInOrder() throws Exception {
		mvc.perform(get("/api/glossary/terms/etf"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("ETF"))
			.andExpect(jsonPath("$.fullName").value("Exchange-traded fund"))
			.andExpect(jsonPath("$.category.slug").value("investing"))
			.andExpect(jsonPath("$.definitionStandard").value(org.hamcrest.Matchers.containsString("[[stock|stocks]]")))
			.andExpect(jsonPath("$.definitionPlain").isNotEmpty())
			.andExpect(jsonPath("$.related[0].slug").value("stock"))
			.andExpect(jsonPath("$.related[1].slug").value("bond"))
			.andExpect(jsonPath("$.lesson").isEmpty());
	}

	@Test
	void termWithoutPlainVersionReturnsNullAndLinkedLessonIsIncluded() throws Exception {
		mvc.perform(get("/api/glossary/terms/dividend"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.definitionPlain").isEmpty());
		mvc.perform(get("/api/glossary/terms/compound-interest"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.lesson.id").value(2))
			.andExpect(jsonPath("$.lesson.title").value("Compound interest"));
	}

	@Test
	void unknownTermIs404() throws Exception {
		mvc.perform(get("/api/glossary/terms/nope")).andExpect(status().isNotFound());
	}

}
