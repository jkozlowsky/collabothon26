package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
class CheckQuestionControllerTests {

	/** Quiz steps that name their story's character (Ji-woo in Seoul, Rafa in São Paulo): never asked outside it. */
	private static final Set<String> NAMING_THE_CHARACTER = Set.of("seoul-1/q1", "seoul-2/q1", "seoul-2/q2", "seoul-5/q2",
			"sao-paulo-1/q2", "sao-paulo-2/q1", "sao-paulo-3/q1", "sao-paulo-4/q1", "sao-paulo-5/q1");

	private static final Map<String, String> AREA_OF_STORY = Map.of("seoul", "investing", "berlin", "saving",
			"sao-paulo", "debt", "tokyo", "investing");

	@Autowired
	MockMvc mvc;

	@Autowired
	JsonMapper json;

	@Autowired
	LessonContentRepository lessonContent;

	private JsonNode pool() throws Exception {
		return json.readTree(mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString());
	}

	@Test
	void aQuestionIsALessonsQuizStepWithItsStorysArea() throws Exception {
		JsonNode step = lessonContent.lesson("berlin-1").orElseThrow().path("steps").valueStream()
			.filter(s -> s.path("id").asString().equals("q1"))
			.findFirst()
			.orElseThrow();

		JsonNode question = pool().valueStream()
			.filter(q -> q.get("id").stringValue().equals("berlin-1/q1"))
			.findFirst()
			.orElseThrow();

		// The whole object: these seven fields are the contract.
		assertEquals(json.readTree("""
				{"id": "berlin-1/q1", "lessonId": "berlin-1", "area": "saving", "prompt": %s, "options": %s,
				 "correctIndex": %d, "explanation": %s}"""
			.formatted(step.get("prompt"), step.get("options"), step.get("correctIndex").intValue(),
					step.get("explanation"))), question);
	}

	@Test
	void thePoolHasTheQuizStepsThatStandOutsideTheirStoryInStoryOrderWithAResolvableLesson() throws Exception {
		List<String> expected = new ArrayList<>();
		for (JsonNode story : lessonContent.stories()) {
			for (String lessonId : lessonContent.lessonIdsOf(story)) {
				JsonNode lesson = lessonContent.lesson(lessonId).orElseThrow();
				lesson.path("steps").valueStream()
					.filter(s -> s.path("type").asString().equals("quiz") && !s.has("chart"))
					.map(s -> lessonId + "/" + s.path("id").asString())
					.filter(id -> !NAMING_THE_CHARACTER.contains(id))
					.forEach(expected::add);
			}
		}
		JsonNode pool = pool();

		assertEquals(expected, pool.valueStream().map(q -> q.get("id").stringValue()).toList());
		// 37 quiz steps: three are about a chart the test cannot show, nine name their story's character.
		assertEquals(25, pool.size());
		for (JsonNode q : pool) {
			String id = q.get("id").stringValue();
			String lessonId = q.get("lessonId").stringValue();
			JsonNode lesson = lessonContent.lesson(lessonId).orElseThrow();
			assertTrue(id.startsWith(lessonId + "/"), id);
			assertEquals(AREA_OF_STORY.get(lesson.path("story").asString()), q.get("area").stringValue(), id);
			assertTrue(q.get("options").size() >= 2, id);
			assertTrue(q.get("correctIndex").intValue() < q.get("options").size(), id);
			assertFalse(q.get("prompt").stringValue().isBlank(), id);
			assertFalse(q.get("explanation").stringValue().isBlank(), id);
		}
	}

	@Test
	void noQuestionTextNamesAStoryCharacter() throws Exception {
		List<String> names = lessonContent.stories().stream()
			.map(story -> story.path("character").path("name").asString(""))
			.filter(name -> !name.isEmpty())
			.toList();

		assertEquals(List.of("Ji-woo", "Rafa"), names);
		for (JsonNode q : pool()) {
			String text = q.get("prompt") + " " + q.get("options") + " " + q.get("explanation");
			names.forEach(name -> assertFalse(text.contains(name), q.get("id").stringValue()));
		}
	}

	@Test
	void aLessonWithoutAQuestionLeftIsNeverTested() throws Exception {
		Set<String> tested = new HashSet<>();
		pool().forEach(q -> tested.add(q.get("lessonId").stringValue()));

		// seoul-4 has no quiz step; the only quiz steps of seoul-2 and sao-paulo-2 name the character.
		assertFalse(tested.contains("seoul-4"));
		assertFalse(tested.contains("seoul-2"));
		assertFalse(tested.contains("sao-paulo-2"));
		assertEquals(17, tested.size());
	}

}
