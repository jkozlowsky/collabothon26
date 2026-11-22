package com.collabothon.back.glossary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
class GlossarySearchTests {

	@Autowired
	MockMvc mvc;

	@Test
	void prefixMatchesComeFirstAndCarryTheirCategory() throws Exception {
		mvc.perform(get("/api/glossary/search").param("q", "div"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.terms[*].slug").value(containsInAnyOrder("diversification", "dividend")))
			.andExpect(jsonPath("$.terms[0].category.slug").value("investing"))
			.andExpect(jsonPath("$.terms[0].shortDescription").isNotEmpty())
			.andExpect(jsonPath("$.suggestions").isEmpty());
	}

	@Test
	void nameStartingWithQueryRanksAboveNameContainingIt() throws Exception {
		// "stock" is the name of Stock (prefix) and part of nothing else by name, but "Index" has alias "stock index".
		mvc.perform(get("/api/glossary/search").param("q", "stock"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.terms[0].slug").value("stock"))
			.andExpect(jsonPath("$.terms[*].slug").value(hasItem("index")));
	}

	@Test
	void isCaseInsensitiveAndTrimsTheQuery() throws Exception {
		mvc.perform(get("/api/glossary/search").param("q", "  ETF "))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.terms[0].slug").value("etf"));
	}

	@Test
	void findsTermsBySynonym() throws Exception {
		mvc.perform(get("/api/glossary/search").param("q", "rainy"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.terms[0].slug").value("emergency-fund"));
	}

	@Test
	void listsTermsThatMentionTheTextInTheirDefinition() throws Exception {
		mvc.perform(get("/api/glossary/search").param("q", "dividend"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.terms[0].slug").value("dividend"))
			.andExpect(jsonPath("$.mentions[*].slug").value(hasItem("stock")))
			.andExpect(jsonPath("$.mentions[*].slug").value(not(hasItem("dividend"))))
			.andExpect(jsonPath("$.mentions[?(@.slug=='stock')].snippet").value(hasItem(containsString("dividend"))));
	}

	@Test
	void snippetsContainNoLinkMarkup() throws Exception {
		String body = mvc.perform(get("/api/glossary/search").param("q", "bond"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		assertThat(body).doesNotContain("[[").doesNotContain("]]");
	}

	@Test
	void suggestsTheClosestNameForATypo() throws Exception {
		mvc.perform(get("/api/glossary/search").param("q", "divdend"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.terms").isEmpty())
			.andExpect(jsonPath("$.suggestions[0].slug").value("dividend"));
	}

	@Test
	void wildcardCharactersAreTreatedAsPlainText() throws Exception {
		for (String q : new String[] { "%", "_", "\\" }) {
			mvc.perform(get("/api/glossary/search").param("q", q))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.terms").isEmpty());
		}
	}

	@Test
	void rejectsEmptyAndTooLongQueries() throws Exception {
		mvc.perform(get("/api/glossary/search").param("q", "   ")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/glossary/search").param("q", "x".repeat(65))).andExpect(status().isBadRequest());
		mvc.perform(get("/api/glossary/search")).andExpect(status().isBadRequest());
	}

	@Test
	void queryIsValidatedOnTheRequest() throws Exception {
		mvc.perform(get("/api/glossary/search"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Required parameter 'q' is not present."));
		// The last is only Unicode spaces: an empty query after strip() would match every term.
		for (String q : new String[] { "", "   ", "x".repeat(65), " " + "x".repeat(64) + " ", "\u2003\u2003" }) {
			mvc.perform(get("/api/glossary/search").param("q", q))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Validation failure"))
				.andExpect(jsonPath("$.code").doesNotExist());
		}
		mvc.perform(get("/api/glossary/search").param("q", "x".repeat(64))).andExpect(status().isOk());
	}

}
