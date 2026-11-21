package com.collabothon.back.glossary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class GlossaryControllerTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

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
			.andExpect(jsonPath("$.related[1].slug").value("bond"));
	}

	@Test
	@Transactional
	void termWithoutPlainVersionReturnsNull() throws Exception {
		// Every seeded term has a plain version, so add one without it; the test transaction rolls it back.
		jdbc.update("""
				INSERT INTO glossary_term (id, slug, name, category_id, position, short_description, definition_standard)
				VALUES (9999, 'no-plain-yet', 'No plain yet', 1, 99, 'Test term', 'Standard text only.')
				""");
		mvc.perform(get("/api/glossary/terms/no-plain-yet"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.definitionPlain").isEmpty());
	}

	@Test
	void unknownTermIs404() throws Exception {
		mvc.perform(get("/api/glossary/terms/nope")).andExpect(status().isNotFound());
	}

}
