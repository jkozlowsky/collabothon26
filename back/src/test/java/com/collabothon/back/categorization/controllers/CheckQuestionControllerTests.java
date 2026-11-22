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
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=test-key")
@AutoConfigureMockMvc
class CheckQuestionControllerTests {

	// Seoul's story area is "Risk" and Buenos Aires's "Money basics": the test rates them with investing and saving.
	private static final Map<String, String> AREA_OF_STORY = Map.of("seoul", "investing", "berlin", "saving",
			"sao-paulo", "debt", "tokyo", "investing", "buenos-aires", "saving", "nairobi", "saving", "mumbai",
			"investing");

	@Autowired
	MockMvc mvc;

	@Autowired
	JsonMapper json;

	@Autowired
	LessonContentRepository lessonContent;

	@Autowired
	StoryRepository stories;

	private JsonNode pool() throws Exception {
		return json.readTree(mvc.perform(get("/api/check-questions"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString());
	}

	@Test
	void aQuestionIsALessonsQuizStepWithItsStorysArea() throws Exception {
		JsonNode step = lessonContent.findById("berlin-1").orElseThrow().node().path("steps").valueStream()
			.filter(s -> s.path("id").asString().equals("q1"))
			.findFirst()
			.orElseThrow();

		JsonNode question = pool().valueStream()
			.filter(q -> q.get("id").stringValue().equals("berlin-1/q1"))
			.findFirst()
			.orElseThrow();

		// The whole object: these seven fields are the contract. The lesson's "Checkpoint 1 of 3 · " is cut off.
		assertEquals("Checkpoint 1 of 3 · What does an inflation rate of 3% mean?", step.get("prompt").stringValue());
		assertEquals(json.readTree("""
				{"id": "berlin-1/q1", "lessonId": "berlin-1", "area": "saving",
				 "prompt": "What does an inflation rate of 3%% mean?", "options": %s, "correctIndex": %d,
				 "explanation": %s}"""
			.formatted(step.get("options"), step.get("correctIndex").intValue(), step.get("explanation"))), question);
	}

	@Test
	void thePoolHasTheQuizStepsWithoutAChartInStoryOrderWithAResolvableLesson() throws Exception {
		List<String> expected = new ArrayList<>();
		for (Story story : stories.findAll()) {
			for (String lessonId : story.lessonIds()) {
				JsonNode lesson = lessonContent.findById(lessonId).orElseThrow().node();
				lesson.path("steps").valueStream()
					.filter(s -> s.path("type").asString().equals("quiz") && !s.has("chart"))
					.map(s -> lessonId + "/" + s.path("id").asString())
					.forEach(expected::add);
			}
		}
		JsonNode pool = pool();

		assertEquals(expected, pool.valueStream().map(q -> q.get("id").stringValue()).toList());
		// 46 quiz steps: five are about a chart the test cannot show.
		assertEquals(41, pool.size());
		for (JsonNode q : pool) {
			String id = q.get("id").stringValue();
			String lessonId = q.get("lessonId").stringValue();
			JsonNode lesson = lessonContent.findById(lessonId).orElseThrow().node();
			assertTrue(id.startsWith(lessonId + "/"), id);
			assertEquals(AREA_OF_STORY.get(lesson.path("story").asString()), q.get("area").stringValue(), id);
			assertTrue(q.get("options").size() >= 2, id);
			assertTrue(q.get("correctIndex").intValue() < q.get("options").size(), id);
			assertFalse(q.get("prompt").stringValue().isBlank(), id);
			assertFalse(q.get("prompt").stringValue().startsWith("Checkpoint"), id);
			assertFalse(q.get("explanation").stringValue().isBlank(), id);
		}
	}

	@Test
	void aLessonWithoutAQuestionLeftIsNeverTested() throws Exception {
		Set<String> tested = new HashSet<>();
		pool().forEach(q -> tested.add(q.get("lessonId").stringValue()));

		// seoul-4 has no quiz step; the other 22 lessons have one without a chart.
		assertFalse(tested.contains("seoul-4"));
		assertEquals(22, tested.size());
	}

}
