package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
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
import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.entities.CheckQuestion;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.QuestionLevel;
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;
import com.collabothon.back.lesson.LessonContent;

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
	CheckQuestionRepository questions;

	@Autowired
	JsonMapper json;

	@Autowired
	LessonContent lessonContent;

	private static final String LESSON = "berlin-1";

	/** The row each broken one starts from: valid, an account version with one slot. */
	private static CheckQuestion valid() {
		return CheckQuestion.builder()
			.id("zz-valid")
			.lessonId(LESSON)
			.area(FocusArea.SAVING)
			.level(QuestionLevel.EASY)
			.accountPrompt("€{monthOut}")
			.slots(List.of("monthOut"))
			.genericPrompt("€100")
			.options(List.of("a", "b", "c"))
			.correctIndex(0)
			.misconceptions(Arrays.asList(null, "m1", "m2"))
			.checks("Whether it works.")
			.build();
	}

	@Test
	@Transactional
	void theBankComesOrderedByIdWithTheCorrectOptionOnly() throws Exception {
		questions.deleteAllInBatch();
		CheckQuestion row = valid().toBuilder()
			.accountPrompt("You hold €{savingsBalance}.")
			.slots(List.of("savingsBalance"))
			.genericPrompt("You hold €100.")
			.build();
		questions.save(row.toBuilder().id("zz-second").correctIndex(1).misconceptions(Arrays.asList("m0", null, "m2"))
			.build());
		questions.save(row.toBuilder().id("zz-first").build());

		mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andExpect(content().json("""
					[{"id": "zz-first", "area": "saving", "accountPrompt": "You hold €{savingsBalance}.",
					  "slots": ["savingsBalance"], "genericPrompt": "You hold €100.", "options": ["a", "b", "c"],
					  "correctIndex": 0},
					 {"id": "zz-second", "area": "saving", "accountPrompt": "You hold €{savingsBalance}.",
					  "slots": ["savingsBalance"], "genericPrompt": "You hold €100.", "options": ["a", "b", "c"],
					  "correctIndex": 1}]""",
					JsonCompareMode.STRICT));
	}

	static Stream<Arguments> rowsBreakingTheBankRules() {
		return Stream.of(
				Arguments.of("id not a slug", valid().toBuilder().id("Zz Broken").build()),
				Arguments.of("unknown slot", valid().toBuilder().accountPrompt("€{salary}").slots(List.of("salary")).build()),
				Arguments.of("two options",
						valid().toBuilder().options(List.of("a", "b")).misconceptions(Arrays.asList(null, "m1")).build()),
				Arguments.of("five options", valid().toBuilder().options(List.of("a", "b", "c", "d", "e"))
					.misconceptions(Arrays.asList(null, "m1", "m2", "m3", "m4")).build()),
				Arguments.of("a NULL option", valid().toBuilder().options(Arrays.asList("a", null, "c")).build()),
				Arguments.of("an empty option", valid().toBuilder().options(List.of("a", "", "c")).build()),
				Arguments.of("misconceptions shorter than options",
						valid().toBuilder().misconceptions(Arrays.asList(null, "m1")).build()),
				Arguments.of("correct index past the options",
						valid().toBuilder().correctIndex(3).misconceptions(List.of("m0", "m1", "m2")).build()),
				Arguments.of("a misconception on the correct option",
						valid().toBuilder().misconceptions(Arrays.asList("m0", "m1", null)).build()),
				Arguments.of("two NULL misconceptions",
						valid().toBuilder().misconceptions(Arrays.asList(null, null, "m2")).build()),
				Arguments.of("an account prompt without slots",
						valid().toBuilder().accountPrompt("You hold money.").slots(List.of()).build()),
				Arguments.of("slots without an account prompt", valid().toBuilder().accountPrompt(null).build()),
				Arguments.of("a slot in the generic prompt", valid().toBuilder().genericPrompt("€{monthOut}").build()));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("rowsBreakingTheBankRules")
	@Transactional
	void aRowBreakingTheBankRulesIsRejectedByTheSchema(String name, CheckQuestion row) {
		assertThrows(DataIntegrityViolationException.class, () -> questions.saveAndFlush(row));
	}

	// The entity's enums cannot hold a value outside the set, so only SQL can send one.
	@ParameterizedTest(name = "{0} outside its set")
	@CsvSource({ "area, 'wizardry', 'easy'", "level, 'saving', 'medium'" })
	@Transactional
	void anAreaOrLevelOutsideItsSetIsRejectedByTheSchema(String name, String area, String level) {
		assertThrows(DataIntegrityViolationException.class, () -> jdbc.sql("""
				INSERT INTO check_question (id, lesson_id, area, level, account_prompt, slots, generic_prompt, options,
				                            correct_index, misconceptions, checks)
				VALUES ('zz-broken', 'berlin-1', ?, ?, NULL, ARRAY[]::TEXT[], '€100', ARRAY['a', 'b', 'c'], 0,
				        ARRAY[NULL, 'm1', 'm2'], 'Whether it works.')""").params(area, level).update());
	}

	@Test
	@Transactional
	void theRowTheBrokenOnesStartFromIsAccepted() {
		questions.saveAndFlush(valid());
		questions.saveAndFlush(valid().toBuilder().id("zz-generic").accountPrompt(null).slots(List.of()).build());
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

	@Test
	void everySeededBankLessonIsInTheLessonContent() {
		List<String> lessonIds = questions.findAll().stream().map(CheckQuestion::getLessonId).distinct().toList();

		assertFalse(lessonIds.isEmpty());
		lessonIds.forEach(id -> assertTrue(lessonContent.lesson(id).isPresent(), id));
	}

	@Test
	void theSeededBankHoldsBothHorizonQuestions() throws Exception {
		mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[?(@.id == '%s')].area".formatted(CategorizationConsts.SHORT_HORIZON_QUESTION_ID))
				.value("saving"))
			.andExpect(jsonPath("$[?(@.id == '%s')].area".formatted(CategorizationConsts.LONG_HORIZON_QUESTION_ID))
				.value("investing"));
	}

}
