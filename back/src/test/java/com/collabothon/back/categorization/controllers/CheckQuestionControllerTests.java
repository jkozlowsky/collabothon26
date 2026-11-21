package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
class CheckQuestionControllerTests {

	private static final Set<String> KNOWN_SLOTS = Set.of("savingsBalance", "savingsInterestRate", "monthOut",
			"loanRemaining", "loanApr", "cardUsed", "cardLimit", "etfMonthly", "depotTotal", "positionCount");

	private static final String ACCOUNT_PROMPT = "You keep €{savingsBalance} in savings and spend about €{monthOut}"
			+ " a month. If your income stopped tomorrow, how long would your money last?";

	private static final String GENERIC_PROMPT = "Imagine you keep €5,000 in savings and spend €1,500 a month."
			+ " If your income stopped tomorrow, how long would your money last, and how did you work it out?";

	private static final Pattern PLACEHOLDER = Pattern.compile("\\{(\\w+)}");

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	JsonMapper json;

	private JsonNode pool() throws Exception {
		return json.readTree(mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString());
	}

	@Test
	void poolIsOrderedByIdAndKeepsTheCriterionInTheBackend() throws Exception {
		JsonNode pool = pool();

		List<String> ids = new ArrayList<>();
		pool.forEach(q -> ids.add(q.get("id").stringValue()));
		assertEquals(List.of("card-minimum", "etf-drop", "loan-apr", "one-etf-vs-one-stock", "pension-gap",
				"rate-vs-inflation", "savings-runway", "time-in-market", "too-good-offer"), ids);
		pool.forEach(q -> assertFalse(q.has("criterion"), q.get("id").stringValue()));
	}

	@Test
	void savingsRunwayCarriesBothVersionsAndItsLesson() throws Exception {
		Long emergencyFund = jdbc.sql("SELECT id FROM lesson WHERE position = 1").query(Long.class).single();

		mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					[{"id": "card-minimum"}, {"id": "etf-drop"}, {"id": "loan-apr"}, {"id": "one-etf-vs-one-stock"},
					 {"id": "pension-gap"}, {"id": "rate-vs-inflation"},
					 {"id": "savings-runway", "category": "finance", "area": "saving", "lessonId": %d,
					  "accountPrompt": "%s",
					  "slots": ["savingsBalance", "monthOut"],
					  "genericPrompt": "%s"},
					 {"id": "time-in-market"}, {"id": "too-good-offer"}]"""
						.formatted(emergencyFund, ACCOUNT_PROMPT, GENERIC_PROMPT),
					JsonCompareMode.LENIENT));
	}

	@Test
	void everyQuestionThatShouldTeachALessonIsLinkedToOne() throws Exception {
		Map<String, Integer> lessonPosition = Map.of("savings-runway", 1, "time-in-market", 2, "rate-vs-inflation", 3);

		for (JsonNode q : pool()) {
			String id = q.get("id").stringValue();
			if (lessonPosition.containsKey(id)) {
				Long expected = jdbc.sql("SELECT id FROM lesson WHERE position = ?")
					.param(lessonPosition.get(id))
					.query(Long.class)
					.single();
				assertFalse(q.get("lessonId").isNull(), id + " has no lesson");
				assertEquals(expected, q.get("lessonId").longValue(), id);
			}
			else {
				assertTrue(q.get("lessonId").isNull(), id);
			}
		}
	}

	@Test
	void everyPlaceholderIsADeclaredKnownSlot() throws Exception {
		for (JsonNode q : pool()) {
			String id = q.get("id").stringValue();
			Set<String> declared = new HashSet<>();
			q.get("slots").forEach(s -> declared.add(s.stringValue()));
			assertTrue(KNOWN_SLOTS.containsAll(declared), id);
			assertFalse(PLACEHOLDER.matcher(q.get("genericPrompt").stringValue()).find(), id);
			if (q.get("accountPrompt").isNull()) {
				assertTrue(declared.isEmpty(), id);
				continue;
			}
			Set<String> used = new HashSet<>();
			Matcher m = PLACEHOLDER.matcher(q.get("accountPrompt").stringValue());
			while (m.find()) {
				used.add(m.group(1));
			}
			assertEquals(declared, used, id);
		}
	}

	@Test
	@Transactional
	void poolIsEmptyWhenACategoryHasFewerThanTwoAreas() throws Exception {
		jdbc.sql("DELETE FROM check_question WHERE area IN ('risk', 'retirement')").update();

		mvc.perform(get("/api/check-questions")).andExpect(status().isOk()).andExpect(content().json("[]"));
	}

}
