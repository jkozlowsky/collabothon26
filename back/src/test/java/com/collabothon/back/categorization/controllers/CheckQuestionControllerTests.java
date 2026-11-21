package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
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

	private static final Pattern PLACEHOLDER = Pattern.compile("\\{(\\w+)}");

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	JsonMapper json;

	private long newLesson() {
		return jdbc.sql("INSERT INTO lesson (position, emoji, title, summary, xp) VALUES (9, 'x', 'T', 'S', 1)"
				+ " RETURNING id").query(Long.class).single();
	}

	private void insert(String id, long lessonId, String misconceptions, int correctIndex) {
		jdbc.sql("""
				INSERT INTO check_question (id, lesson_id, area, level, account_prompt, slots, generic_prompt, options,
				                            correct_index, misconceptions, checks)
				VALUES (?, ?, 'saving', 'easy', 'You hold €{savingsBalance}.', ARRAY['savingsBalance'], 'You hold €100.',
				        ARRAY['a', 'b', 'c'], ?, %s, 'Whether it works.')""".formatted(misconceptions))
			.params(id, lessonId, correctIndex)
			.update();
	}

	@Test
	@Transactional
	void theBankComesOrderedByIdWithoutTheAnswerKey() throws Exception {
		jdbc.sql("DELETE FROM check_question").update();
		long lesson = newLesson();
		insert("zz-second", lesson, "ARRAY['m0', NULL, 'm2']", 1);
		insert("zz-first", lesson, "ARRAY[NULL, 'm1', 'm2']", 0);

		mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					[{"id": "zz-first", "area": "saving", "accountPrompt": "You hold €{savingsBalance}.",
					  "slots": ["savingsBalance"], "genericPrompt": "You hold €100.", "options": ["a", "b", "c"]},
					 {"id": "zz-second", "area": "saving", "accountPrompt": "You hold €{savingsBalance}.",
					  "slots": ["savingsBalance"], "genericPrompt": "You hold €100.", "options": ["a", "b", "c"]}]""",
					JsonCompareMode.STRICT));
	}

	@Test
	@Transactional
	void aMisconceptionOnTheCorrectOptionIsRejectedByTheSchema() {
		long lesson = newLesson();

		assertThrows(DataIntegrityViolationException.class,
				() -> insert("zz-broken", lesson, "ARRAY['m0', 'm1', NULL]", 0));
	}

	@Test
	void everyPlaceholderInTheSeededBankIsADeclaredKnownSlot() throws Exception {
		JsonNode bank = json.readTree(mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString());

		assertFalse(bank.isEmpty());
		for (JsonNode q : bank) {
			String id = q.get("id").stringValue();
			Set<String> declared = new HashSet<>();
			q.get("slots").forEach(s -> declared.add(s.stringValue()));
			assertTrue(KNOWN_SLOTS.containsAll(declared), id);
			assertFalse(PLACEHOLDER.matcher(q.get("genericPrompt").stringValue()).find(), id);
			q.get("options").forEach(o -> assertFalse(PLACEHOLDER.matcher(o.stringValue()).find(), id));
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

}
