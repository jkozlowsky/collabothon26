package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.xp.services.XpService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class DuelIntegrationTests {

	static final MutableClock CLOCK = new MutableClock(Instant.parse("2026-11-23T10:00:00Z"));

	@TestBean
	Clock clock;

	static Clock clock() {
		return CLOCK;
	}

	@Autowired
	MockMvc mvc;

	@Autowired
	JsonMapper json;

	@Autowired
	JdbcClient jdbc;

	@Autowired
	XpService xpService;

	@Test
	void categoriesReturnsStoriesInOrderWithFullNamesAndLevels() throws Exception {
		mvc.perform(get("/api/duel/categories").param("userId", "demo-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(4))
			.andExpect(jsonPath("$[0].story").value("seoul"))
			.andExpect(jsonPath("$[0].name").value("Hype i dźwignia"))
			.andExpect(jsonPath("$[0].color").value("violet"))
			.andExpect(jsonPath("$[1].story").value("berlin"))
			.andExpect(jsonPath("$[1].name").value("Inflacja i oszczędności"))
			.andExpect(jsonPath("$[1].color").value("teal"))
			.andExpect(jsonPath("$[2].story").value("sao-paulo"))
			.andExpect(jsonPath("$[2].name").value("Raty i długi"))
			.andExpect(jsonPath("$[3].story").value("tokyo"))
			.andExpect(jsonPath("$[3].name").value("Dywersyfikacja"));
	}

	@Test
	void startMatchValidatesInputsAndReturnsStrippedStep() throws Exception {
		// Empty categories -> 400
		mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[],\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest());

		// Unknown category -> 400
		mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[\"unknown\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest());

		// Valid start SOLO
		String soloRes = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"player-solo\",\"categories\":[\"berlin\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("SOLO"))
			.andExpect(jsonPath("$.rival").doesNotExist())
			.andExpect(jsonPath("$.questionCount").value(6))
			.andExpect(jsonPath("$.question.index").value(0))
			.andExpect(jsonPath("$.question.step.prompt").exists())
			.andExpect(jsonPath("$.question.step.correctIndex").doesNotExist())
			.andExpect(jsonPath("$.question.step.explanation").doesNotExist())
			.andReturn().getResponse().getContentAsString();

		JsonNode soloNode = json.readTree(soloRes);
		long matchId = soloNode.get("matchId").asLong();
		assertThat(matchId).isPositive();

		// Valid start HUMAN -> rival card present
		mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"player-human\",\"categories\":[\"berlin\",\"seoul\"],\"mode\":\"HUMAN\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("HUMAN"))
			.andExpect(jsonPath("$.rival.name").exists())
			.andExpect(jsonPath("$.rival.avatar").exists())
			.andExpect(jsonPath("$.rival.levels.berlin").exists())
			.andExpect(jsonPath("$.you.levels.berlin").exists());
	}

	@Test
	void soloMatchFullFlowAnswersTimeoutsAndZeroXp() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T12:00:00Z"));
		String startRes = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"categories\":[\"berlin\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		long matchId = json.readTree(startRes).get("matchId").asLong();

		// Cannot get result while in progress -> 409
		mvc.perform(get("/api/duel/matches/{id}", matchId).param("userId", "solo-runner"))
			.andExpect(status().isConflict());

		// Question 0 (quiz): right answer option 0
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":0,\"option\":0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.index").value(0))
			.andExpect(jsonPath("$.correct").value(true))
			.andExpect(jsonPath("$.timedOut").value(false))
			.andExpect(jsonPath("$.nextQuestion.index").value(1))
			.andExpect(jsonPath("$.finished").value(false));

		// Idempotency: re-submitting index 0 returns same result
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":0,\"option\":0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.index").value(0))
			.andExpect(jsonPath("$.correct").value(true));

		// Question 1 (predict): right answer 19500
		CLOCK.advance(Duration.ofSeconds(3));
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":1,\"value\":19500.0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(true));

		// Question 2 (quiz): wrong answer option 2
		CLOCK.advance(Duration.ofSeconds(2));
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":2,\"option\":2}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(false));

		// Question 3 (chart): advance clock by 100 seconds to test timeout!
		CLOCK.advance(Duration.ofSeconds(100));
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":3,\"value\":10.0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.timedOut").value(true))
			.andExpect(jsonPath("$.correct").value(false));

		// Question 4 (sort): 0 mistakes
		CLOCK.advance(Duration.ofSeconds(5));
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":4,\"mistakes\":0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(true));

		// Question 5 (match): 0 mistakes (final question)
		CLOCK.advance(Duration.ofSeconds(5));
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"index\":5,\"mistakes\":0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nextQuestion").doesNotExist())
			.andExpect(jsonPath("$.yourFinal.score").value(4))
			.andExpect(jsonPath("$.yourFinal.xpGained").value(0)) // 0 in SOLO!
			.andExpect(jsonPath("$.finished").value(true));

		// SOLO match gives 0 XP: xp_event has no entries
		int xp = xpService.totalXp("solo-runner");
		assertThat(xp).isZero();

		// State shows finished
		mvc.perform(get("/api/duel/matches/{id}/state", matchId).param("userId", "solo-runner"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.finished").value(true))
			.andExpect(jsonPath("$.question").doesNotExist())
			.andExpect(jsonPath("$.yourResults[0]").value(true))
			.andExpect(jsonPath("$.yourResults[2]").value(false))
			.andExpect(jsonPath("$.yourResults[3]").value(false));

		// Result & review
		mvc.perform(get("/api/duel/matches/{id}", matchId).param("userId", "solo-runner"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.outcome").value("SOLO"))
			.andExpect(jsonPath("$.score").value(4))
			.andExpect(jsonPath("$.rivalScore").doesNotExist())
			.andExpect(jsonPath("$.xpGained").value(0))
			.andExpect(jsonPath("$.review.length()").value(6))
			.andExpect(jsonPath("$.review[0].lessonTitle").exists())
			.andExpect(jsonPath("$.review[3].yourAnswer").doesNotExist()); // timed out
	}

	@Test
	void humanMatchAwards5XpPerCorrectAnswerAndRecordsInXpEvent() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T14:00:00Z"));
		String startRes = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"categories\":[\"berlin\"],\"mode\":\"HUMAN\"}"))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		long matchId = json.readTree(startRes).get("matchId").asLong();

		// Answer all 6 questions correctly
		// Q0: quiz (opt 0)
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"index\":0,\"option\":0}")).andExpect(status().isOk());

		// Q1: predict (19500)
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"index\":1,\"value\":19500.0}")).andExpect(status().isOk());

		// Q2: quiz (opt 0)
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"index\":2,\"option\":0}")).andExpect(status().isOk());

		// Q3: chart (10.0)
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"index\":3,\"value\":10.0}")).andExpect(status().isOk());

		// Q4: sort (mistakes 0)
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"index\":4,\"mistakes\":0}")).andExpect(status().isOk());

		// Q5: match (mistakes 0)
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"index\":5,\"mistakes\":0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.yourFinal.score").value(6))
			.andExpect(jsonPath("$.yourFinal.xpGained").value(30)); // 6 * 5 = 30 XP

		// XP was written immediately upon finishing (before rival is settled)
		int totalXp = xpService.totalXp("human-player");
		assertThat(totalXp).isEqualTo(30);

		int berlinXp = xpService.xpPerCategory("human-player").get("berlin");
		assertThat(berlinXp).isEqualTo(30);

		// Advance clock by 10 seconds to allow rival's last answer to arrive
		CLOCK.advance(Duration.ofSeconds(10));

		// Settle and check result
		mvc.perform(get("/api/duel/matches/{id}", matchId).param("userId", "human-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.score").value(6))
			.andExpect(jsonPath("$.rivalScore").value(5)) // rival scored max(6 - 1, 0) = 5
			.andExpect(jsonPath("$.outcome").value("WIN"))
			.andExpect(jsonPath("$.xpGained").value(30))
			.andExpect(jsonPath("$.xpByCategory.berlin").value(30));

		// History lists this match as seen
		mvc.perform(get("/api/duel/matches").param("userId", "human-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].matchId").value(matchId))
			.andExpect(jsonPath("$[0].status").value("FINISHED"))
			.andExpect(jsonPath("$[0].seen").value(true))
			.andExpect(jsonPath("$[0].score").value(6))
			.andExpect(jsonPath("$[0].rivalScore").value(5))
			.andExpect(jsonPath("$[0].outcome").value("WIN"));
	}

	@Test
	void historyOrdersUnfinishedFirstThenFinishedNewestFirst() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T16:00:00Z"));

		// Match 1: finished
		String s1 = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"hist-player\",\"categories\":[\"berlin\"],\"mode\":\"SOLO\"}"))
			.andReturn().getResponse().getContentAsString();
		long m1 = json.readTree(s1).get("matchId").asLong();
		for (int i = 0; i < 6; i++) {
			mvc.perform(post("/api/duel/matches/{id}/answers", m1)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"userId\":\"hist-player\",\"index\":" + i + ",\"option\":1}"));
		}

		// Match 2: unfinished
		CLOCK.advance(Duration.ofMinutes(5));
		String s2 = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"hist-player\",\"categories\":[\"berlin\"],\"mode\":\"SOLO\"}"))
			.andReturn().getResponse().getContentAsString();
		long m2 = json.readTree(s2).get("matchId").asLong();

		// Match 3: unfinished (newer)
		CLOCK.advance(Duration.ofMinutes(5));
		String s3 = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"hist-player\",\"categories\":[\"berlin\"],\"mode\":\"SOLO\"}"))
			.andReturn().getResponse().getContentAsString();
		long m3 = json.readTree(s3).get("matchId").asLong();

		// Check history order: unfinished (m3, m2) first, then finished (m1)
		mvc.perform(get("/api/duel/matches").param("userId", "hist-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].matchId").value(m3))
			.andExpect(jsonPath("$[0].status").value("PLAYING"))
			.andExpect(jsonPath("$[1].matchId").value(m2))
			.andExpect(jsonPath("$[1].status").value("PLAYING"))
			.andExpect(jsonPath("$[2].matchId").value(m1))
			.andExpect(jsonPath("$[2].status").value("FINISHED"));
	}

	@Test
	void weeklyRankingsAndCategoryXpEndpoints() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T18:00:00Z"));

		// Seed user ranking test
		xpService.record("rank-user", "berlin", XpSource.DUEL, "test-ref", 50, CLOCK.instant());

		// GET /api/duel/rankings
		mvc.perform(get("/api/duel/rankings").param("userId", "rank-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.top").isArray())
			.andExpect(jsonPath("$.me.userId").value("rank-user"))
			.andExpect(jsonPath("$.me.weeklyXp").value(50));

		// GET /api/xp/{userId}/categories
		mvc.perform(get("/api/xp/rank-user/categories"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(4))
			.andExpect(jsonPath("$[1].category").value("berlin"))
			.andExpect(jsonPath("$[1].xp").value(50))
			.andExpect(jsonPath("$[1].weeklyXp").value(50));
	}

	@Test
	void lessonCompletionWritesXpEventAndUpdatesTotalXp() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T20:00:00Z"));

		// Complete lesson berlin-1
		mvc.perform(post("/api/lessons/berlin-1/result").param("userId", "lesson-tester")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[],\"completedOn\":\"2026-11-23\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.xpAwarded").value(50))
			.andExpect(jsonPath("$.firstCompletion").value(true))
			.andExpect(jsonPath("$.totalXp").value(50));

		// Verify xp_event row was written
		int count = jdbc.sql("SELECT COUNT(*) FROM xp_event WHERE user_id = 'lesson-tester' AND source = 'LESSON' AND category = 'berlin'")
			.query(Integer.class)
			.single();
		assertThat(count).isEqualTo(1);

		// AccountController stats returns totalXp from xp_event
		mvc.perform(get("/api/users/lesson-tester/stats").param("today", "2026-11-23"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalXp").value(50))
			.andExpect(jsonPath("$.lessonsCompleted").value(1));
	}

	static class MutableClock extends Clock {
		private Instant instant;
		private final ZoneId zone;

		MutableClock(Instant initial) {
			this(initial, ZoneId.of("Europe/Warsaw"));
		}

		MutableClock(Instant initial, ZoneId zone) {
			this.instant = initial;
			this.zone = zone;
		}

		void set(Instant instant) {
			this.instant = instant;
		}

		void advance(Duration duration) {
			this.instant = this.instant.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return zone;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return new MutableClock(instant, zone);
		}

		@Override
		public Instant instant() {
			return instant;
		}
	}

}
