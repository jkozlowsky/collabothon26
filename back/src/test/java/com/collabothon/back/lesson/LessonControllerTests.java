package com.collabothon.back.lesson;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class LessonControllerTests {

	@Autowired
	MockMvc mvc;

	@Test
	void listsSeoulLessonsInOrderWithOnlyTheFirstOpen() throws Exception {
		mvc.perform(get("/api/lessons").param("userId", "fresh"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value("seoul-1"))
			.andExpect(jsonPath("$[0].status").value("available"))
			.andExpect(jsonPath("$[1].status").value("locked"))
			.andExpect(jsonPath("$.length()").value(5));
		mvc.perform(get("/api/stories"))
			.andExpect(jsonPath("$[0].id").value("seoul"))
			.andExpect(jsonPath("$[0].current").value(true))
			.andExpect(jsonPath("$[0].nextLesson.id").value("seoul-1"))
			.andExpect(jsonPath("$[1].status").value("coming-soon"));
	}

	@Test
	void returnsLessonWithStepsGlossaryAndPlainVariant() throws Exception {
		mvc.perform(get("/api/lessons/seoul-1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.steps[0].type").value("chat"))
			.andExpect(jsonPath("$.variants").doesNotExist())
			.andExpect(jsonPath("$.next").value("seoul-2"))
			.andExpect(jsonPath("$.glossary.drawdown.term").value("Drawdown"))
			.andExpect(jsonPath("$.steps[6].prompt")
				.value("XYZ fell 50%. What rise does it need to get back to its old price?"));
		mvc.perform(get("/api/lessons/seoul-1").param("lang", "plain"))
			.andExpect(jsonPath("$.lang").value("plain"))
			.andExpect(jsonPath("$.steps[6].prompt").value("A price fell by half. How much must it go up to get back?"))
			.andExpect(jsonPath("$.steps[6].correctIndex").value(1));
	}

	@Test
	void personaFromProfilePicksTheActionTextOnceUnlocked() throws Exception {
		mvc.perform(put("/api/users/grandpa/profile").contentType(MediaType.APPLICATION_JSON)
			.content("{\"lifeStage\":\"pre-retirement\",\"goals\":[],\"skipped\":false}")).andExpect(status().isOk());
		// Without a user id the lesson is open and unpersonalised.
		mvc.perform(get("/api/lessons/seoul-5"))
			.andExpect(jsonPath("$.steps[3].body").value(
					"You hold **{totalAssets}** with us. **{largestPlaceShare}** of it sits in one place: {largestPlaceName}."));
		mvc.perform(get("/api/lessons/seoul-5").param("userId", "grandpa")).andExpect(status().isForbidden());

		for (int i = 1; i <= 4; i++) {
			mvc.perform(post("/api/lessons/seoul-" + i + "/result").param("userId", "grandpa")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"steps\":[]}")).andExpect(status().isOk());
		}
		mvc.perform(get("/api/lessons/seoul-5").param("userId", "grandpa"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.steps[3].body").value(org.hamcrest.Matchers.containsString("Close to retirement")))
			.andExpect(jsonPath("$.glossary.drawdown").exists());
	}

	@Test
	void resultAwardsXpOnceAndChecksScenarioChoices() throws Exception {
		String body = """
				{"steps":[{"stepId":"q1","correctFirstTry":false},{"stepId":"q2","correctFirstTry":true}],
				 "scenarioChoices":{},"lang":"standard"}""";
		mvc.perform(post("/api/lessons/seoul-1/result").param("userId", "mia")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.xpAwarded").value(50))
			.andExpect(jsonPath("$.firstCompletion").value(true))
			.andExpect(jsonPath("$.next").value("seoul-2"));
		mvc.perform(post("/api/lessons/seoul-1/result").param("userId", "mia")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body)).andExpect(jsonPath("$.xpAwarded").value(0)).andExpect(jsonPath("$.totalXp").value(50));

		mvc.perform(post("/api/lessons/seoul-2/result").param("userId", "mia")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[],\"scenarioChoices\":{\"sc1\":7}}")).andExpect(status().isBadRequest());
		mvc.perform(post("/api/lessons/seoul-2/result").param("userId", "mia")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[],\"scenarioChoices\":{\"sc1\":1}}")).andExpect(status().isOk());
	}

	@Test
	void unknownLessonIs404() throws Exception {
		mvc.perform(get("/api/lessons/nowhere-1")).andExpect(status().isNotFound());
	}

}
