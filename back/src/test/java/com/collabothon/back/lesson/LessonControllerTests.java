package com.collabothon.back.lesson;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;

import com.collabothon.back.Race;
import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.entities.lesson.ConceptKnowledgeId;
import com.collabothon.back.lesson.repositories.ConceptKnowledgeRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class LessonControllerTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	TransactionTemplate tx;

	@Autowired
	ConceptKnowledgeRepository concepts;

	@Test
	void listsSeoulLessonsInOrderWithOnlyTheFirstOpen() throws Exception {
		mvc.perform(get("/api/lessons").param("userId", "fresh"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value("seoul-1"))
			.andExpect(jsonPath("$[0].status").value("available"))
			.andExpect(jsonPath("$[1].status").value("locked"))
			.andExpect(jsonPath("$.length()").value(23))
			// Video tracks live in the Saving and Investing paths; berlin-1 is the sixth lesson in story order.
			.andExpect(jsonPath("$[0].video").isEmpty())
			.andExpect(jsonPath("$[5].id").value("berlin-1"))
			.andExpect(jsonPath("$[5].video.minutes").value(5));
		mvc.perform(get("/api/stories"))
			.andExpect(jsonPath("$[0].id").value("seoul"))
			.andExpect(jsonPath("$[0].current").value(true))
			.andExpect(jsonPath("$[0].nextLesson.id").value("seoul-1"))
			.andExpect(jsonPath("$[1].lessons[0].video.minutes").value(5))
			.andExpect(jsonPath("$[1].id").value("berlin"))
			.andExpect(jsonPath("$[1].status").value("available"))
			.andExpect(jsonPath("$[1].current").value(false));
	}

	@Test
	void returnsLessonWithBothOrdersGlossaryAndStoryLook() throws Exception {
		mvc.perform(get("/api/lessons/berlin-1").param("userId", "newcomer"))
			.andExpect(status().isOk())
			// Classic order in steps, video order in beats, in one response.
			.andExpect(jsonPath("$.steps[0].type").value("text"))
			.andExpect(jsonPath("$.steps[5].prompt").value("Checkpoint 1 of 3 · What does an inflation rate of 3% mean?"))
			.andExpect(jsonPath("$.video.beats[0]").value("v1"))
			.andExpect(jsonPath("$.video.beats[1]").value("v2"))
			.andExpect(jsonPath("$.video.beats[9]").value("s2"))
			.andExpect(jsonPath("$.video.scenes.length()").value(2))
			.andExpect(jsonPath("$.startMode").value("video"))
			.andExpect(jsonPath("$.color").value("teal"))
			.andExpect(jsonPath("$.city").value("Berlin"))
			.andExpect(jsonPath("$.landmark.kind").value("gate"))
			.andExpect(jsonPath("$.audioBase").value("/audio/"))
			.andExpect(jsonPath("$.lang").doesNotExist())
			.andExpect(jsonPath("$.variants").doesNotExist())
			.andExpect(jsonPath("$.next").value("berlin-2"))
			.andExpect(jsonPath("$.glossary.inflation.term").value("Inflation"));
		mvc.perform(get("/api/lessons/seoul-3"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.video").isEmpty())
			.andExpect(jsonPath("$.startMode").value("classic"));
	}

	@Test
	void lessonModeIsRememberedPerUser() throws Exception {
		mvc.perform(put("/api/users/reader/lesson-mode").contentType(MediaType.APPLICATION_JSON)
			.content("{\"mode\":\"classic\"}")).andExpect(status().isNoContent());
		mvc.perform(get("/api/lessons/berlin-1").param("userId", "reader"))
			.andExpect(jsonPath("$.startMode").value("classic"));
		mvc.perform(put("/api/users/reader/lesson-mode").contentType(MediaType.APPLICATION_JSON)
			.content("{\"mode\":\"video\"}")).andExpect(status().isNoContent());
		mvc.perform(get("/api/lessons/berlin-1").param("userId", "reader"))
			.andExpect(jsonPath("$.startMode").value("video"));

		mvc.perform(put("/api/users/reader/lesson-mode").contentType(MediaType.APPLICATION_JSON)
			.content("{\"mode\":\"film\"}")).andExpect(status().isBadRequest());
		mvc.perform(put("/api/users/reader/lesson-mode").contentType(MediaType.APPLICATION_JSON)
			.content("{}")).andExpect(status().isBadRequest());
		// Switching mode must not touch the onboarding state.
		mvc.perform(get("/api/users/reader/profile")).andExpect(jsonPath("$.onboardingCompleted").value(false));
	}

	@Test
	void videoResultWithSharedStepsEarnsTheSameXp() throws Exception {
		String body = """
				{"steps":[{"stepId":"q1","correctFirstTry":true},{"stepId":"q2","correctFirstTry":true}],
				 "scenarioChoices":{},"mode":"video"}""";
		mvc.perform(post("/api/lessons/seoul-1/result").param("userId", "viewer")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.xpAwarded").value(50))
			.andExpect(jsonPath("$.firstCompletion").value(true));
		// Scene ids are not steps.
		mvc.perform(post("/api/lessons/seoul-1/result").param("userId", "viewer")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[{\"stepId\":\"v1\",\"correctFirstTry\":true}],\"mode\":\"video\"}"))
			.andExpect(status().isBadRequest());
		// mode is required.
		mvc.perform(post("/api/lessons/seoul-1/result").param("userId", "viewer")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[]}"))
			.andExpect(status().isBadRequest());
	}

	@Test
	void personaFromProfilePicksTheActionTextOnceUnlocked() throws Exception {
		mvc.perform(put("/api/users/grandpa/profile/onboarding").contentType(MediaType.APPLICATION_JSON)
			.content("{\"lifeStage\":\"later-life\",\"interests\":[],\"skipped\":false}")).andExpect(status().isOk());
		// Without a user id the lesson is open and unpersonalised.
		mvc.perform(get("/api/lessons/seoul-5"))
			.andExpect(jsonPath("$.steps[3].body").value(
					"You hold **{totalAssets}** with us. **{largestPlaceShare}** of it sits in one place: {largestPlaceName}."));
		mvc.perform(get("/api/lessons/seoul-5").param("userId", "grandpa")).andExpect(status().isForbidden());

		for (int i = 1; i <= 4; i++) {
			mvc.perform(post("/api/lessons/seoul-" + i + "/result").param("userId", "grandpa")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"steps\":[],\"mode\":\"classic\"}")).andExpect(status().isOk());
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
				 "scenarioChoices":{},"mode":"classic"}""";
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
			.content("{\"steps\":[],\"scenarioChoices\":{\"sc1\":7},\"mode\":\"classic\"}")).andExpect(status().isBadRequest());
		mvc.perform(post("/api/lessons/seoul-2/result").param("userId", "mia")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[],\"scenarioChoices\":{\"sc1\":1},\"mode\":\"video\"}")).andExpect(status().isOk());
	}

	@Test
	void unknownLessonIs404() throws Exception {
		mvc.perform(get("/api/lessons/nowhere-1")).andExpect(status().isNotFound());
	}

	@Test
	void aDoubleTapOnFinishEarnsTheXpOnceAndFailsNothing() throws Exception {
		String userId = "tap-" + UUID.randomUUID();
		MvcResult second = Race.secondDuringFirst(tx, () -> finish(userId), () -> finish(userId));

		assertEquals(200, second.getResponse().getStatus());
		mvc.perform(get("/api/users/{id}/stats", userId).param("today", "2026-11-21"))
			.andExpect(jsonPath("$.totalXp").value(50))
			.andExpect(jsonPath("$.lessonsCompleted").value(1))
			.andExpect(jsonPath("$.currentStreak").value(1));
		assertEquals(2, concepts.findById(new ConceptKnowledgeId(userId, "volatility")).orElseThrow().getAttempts());
	}

	private MvcResult finish(String userId) throws Exception {
		return mvc.perform(post("/api/lessons/seoul-1/result").param("userId", userId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\": [{\"stepId\": \"q1\", \"correctFirstTry\": true}], \"completedOn\": \"2026-11-21\", \"mode\": \"classic\"}"))
			.andReturn();
	}
}
