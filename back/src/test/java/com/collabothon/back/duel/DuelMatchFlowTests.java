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
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.collabothon.back.TestcontainersConfiguration;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** A whole match over REST with a clock the test moves; the fresh players start at level 1 and Elo 1000. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class DuelMatchFlowTests {

	private static final long QUESTION_TIMEOUT_MS = 40_000;

	private static final int QUESTIONS = 6;

	static final MutableClock CLOCK = new MutableClock(Instant.now());

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
	DuelMatchRepository matches;

	@Autowired
	DuelProgressRepository progress;

	@Autowired
	DuelAnswerRepository answers;

	@Test
	void aSoloMatchRunsFromStartToResult() throws Exception {
		JsonNode start = start("solo-player", "SOLO");
		long id = start.get("matchId").asLong();
		assertThat(start.get("rival").isNull()).isTrue();
		assertThat(start.get("questionCount").asInt()).isEqualTo(QUESTIONS);
		assertThat(start.get("question").get("options")).hasSize(4);
		assertThat(start.get("question").get("deadline").asLong()).isEqualTo(CLOCK.millis() + QUESTION_TIMEOUT_MS);
		assertThat(start.toString()).doesNotContain("correct");

		for (int i = 0; i < QUESTIONS; i++) {
			CLOCK.advance(Duration.ofSeconds(3));
			JsonNode result = answer(id, "solo-player", i, 0).andExpect(status().isOk())
				.andExpect(jsonPath("$.index").value(i))
				.andExpect(jsonPath("$.timedOut").value(false))
				.andExpect(jsonPath("$.rivalProgress").isEmpty())
				.andReturn()
				.getResponse()
				.getContentAsString()
				.transform(this::read);
			assertThat(result.get("nextQuestion").isNull()).isEqualTo(i == QUESTIONS - 1);
			assertThat(result.get("finished").asBoolean()).isEqualTo(i == QUESTIONS - 1);
		}
		mvc.perform(get("/api/duel/matches/{id}/state", id).param("userId", "solo-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.finished").value(true))
			.andExpect(jsonPath("$.question").isEmpty())
			.andExpect(jsonPath("$.yourResults.length()").value(QUESTIONS));
		mvc.perform(get("/api/duel/matches/{id}", id).param("userId", "solo-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("SOLO"))
			.andExpect(jsonPath("$.rival").isEmpty())
			.andExpect(jsonPath("$.eloBefore").isEmpty())
			.andExpect(jsonPath("$.review.length()").value(QUESTIONS));
	}

	@Test
	void aQuestionPastItsDeadlineCountsAsNoAnswerAndTheNextOneStartsAtTheDeadline() throws Exception {
		JsonNode start = start("slow-player", "SOLO");
		long id = start.get("matchId").asLong();
		long startedAt = CLOCK.millis();

		CLOCK.advance(Duration.ofMillis(2 * QUESTION_TIMEOUT_MS + 1_000));
		JsonNode state = read(mvc.perform(get("/api/duel/matches/{id}/state", id).param("userId", "slow-player"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString());
		assertThat(state.get("yourResults").get(0).asBoolean()).isFalse();
		assertThat(state.get("yourResults").get(1).asBoolean()).isFalse();
		assertThat(state.get("yourResults").get(2).isNull()).isTrue();
		assertThat(state.get("question").get("index").asInt()).isEqualTo(2);
		assertThat(state.get("question").get("deadline").asLong()).isEqualTo(startedAt + 3 * QUESTION_TIMEOUT_MS);

		// A late answer to the timed-out question reports the timeout and changes nothing.
		answer(id, "slow-player", 0, 1).andExpect(status().isOk())
			.andExpect(jsonPath("$.timedOut").value(true))
			.andExpect(jsonPath("$.correct").value(false))
			.andExpect(jsonPath("$.nextQuestion.index").value(2));
		// Questions that were never opened cannot be answered.
		answer(id, "slow-player", 4, 1).andExpect(status().isBadRequest());

		CLOCK.advance(Duration.ofMillis(QUESTIONS * QUESTION_TIMEOUT_MS));
		mvc.perform(get("/api/duel/matches/{id}", id).param("userId", "slow-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.score").value(0))
			.andExpect(jsonPath("$.xpGained").value(0));
	}

	@Test
	void aBotMatchWaitsForTheRivalsScheduleAndNeverTouchesElo() throws Exception {
		JsonNode start = start("bot-player", "BOT");
		long id = start.get("matchId").asLong();
		assertThat(start.get("rival").get("isBot").asBoolean()).isTrue();
		for (int i = 0; i < QUESTIONS; i++) {
			answer(id, "bot-player", i, 0).andExpect(status().isOk());
		}
		JsonNode waiting = read(mvc.perform(get("/api/duel/matches/{id}/state", id).param("userId", "bot-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.finished").value(false))
			.andExpect(jsonPath("$.question").isEmpty())
			.andExpect(jsonPath("$.rivalProgress.connected").value(true))
			.andReturn()
			.getResponse()
			.getContentAsString());
		assertThat(waiting.get("rivalProgress").get("answered").asInt()).isLessThan(QUESTIONS);
		mvc.perform(get("/api/duel/matches/{id}", id).param("userId", "bot-player")).andExpect(status().isNotFound());

		CLOCK.advance(Duration.ofSeconds(QUESTIONS * 30L + 1));
		mvc.perform(get("/api/duel/matches/{id}/state", id).param("userId", "bot-player"))
			.andExpect(jsonPath("$.finished").value(true))
			.andExpect(jsonPath("$.rivalProgress.answered").value(QUESTIONS));
		mvc.perform(get("/api/duel/matches/{id}", id).param("userId", "bot-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("BOT"))
			.andExpect(jsonPath("$.rival.isBot").value(true))
			.andExpect(jsonPath("$.eloBefore").isEmpty())
			.andExpect(jsonPath("$.eloAfter").isEmpty());
	}

	@Test
	void aHumanMatchPicksARealRivalAndMovesEloForBoth() throws Exception {
		JsonNode start = start("human-player", "HUMAN");
		long id = start.get("matchId").asLong();
		assertThat(start.get("rival").get("isBot").asBoolean()).isFalse();
		assertThat(start.get("rival").get("name").asString()).isNotBlank();
		assertThat(start.get("rival").get("elo").asInt()).isNotNull();
		String rivalId = matches.findById(id).orElseThrow().getPlayerB();
		assertThat(rivalId).startsWith("demo-");
		int rivalMatchesBefore = humanMatches(rivalId);

		for (int i = 0; i < QUESTIONS; i++) {
			answer(id, "human-player", i, i % 4).andExpect(status().isOk());
		}
		CLOCK.advance(Duration.ofSeconds(QUESTIONS * 30L + 1));
		JsonNode end = read(mvc.perform(get("/api/duel/matches/{id}", id).param("userId", "human-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("HUMAN"))
			.andExpect(jsonPath("$.eloBefore").value(1000))
			.andReturn()
			.getResponse()
			.getContentAsString());
		int delta = end.get("eloAfter").asInt() - end.get("eloBefore").asInt();
		switch (end.get("outcome").asString()) {
			case "WIN" -> assertThat(delta).isPositive();
			case "LOSS" -> assertThat(delta).isNegative();
			default -> assertThat(delta).isBetween(-40, 40);
		}
		assertThat(end.get("rival").get("isBot").asBoolean()).isFalse();
		assertThat(humanMatches(rivalId)).isEqualTo(rivalMatchesBefore + 1);
		assertThat(matches.findById(id).orElseThrow().getEloDeltaB()).isNotNull();
		assertThat(answers.findByMatchIdAndUserIdOrderByPositionAsc(id, rivalId)).hasSize(QUESTIONS);
	}

	private int humanMatches(String userId) {
		return progress.findByUserId(userId).stream().mapToInt(DuelProgress::getHumanMatches).sum();
	}

	@Test
	void aMatchBelongsToItsPlayerAndRequestsAreValidated() throws Exception {
		long id = start("owner", "SOLO").get("matchId").asLong();
		mvc.perform(get("/api/duel/matches/{id}/state", id).param("userId", "someone-else"))
			.andExpect(status().isNotFound());
		answer(id, "someone-else", 0, 0).andExpect(status().isNotFound());
		answer(id, "owner", 0, 4).andExpect(status().isBadRequest());
		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"owner\",\"category\":\"nope\",\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest());
		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"owner\",\"category\":\"instruments\"}"))
			.andExpect(status().isBadRequest());
	}

	private JsonNode start(String userId, String mode) throws Exception {
		String body = "{\"userId\":\"%s\",\"category\":\"instruments\",\"mode\":\"%s\",\"lang\":\"en\"}".formatted(userId,
				mode);
		return read(mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString());
	}

	private ResultActions answer(long id, String userId, int index, int option) throws Exception {
		String body = "{\"userId\":\"%s\",\"index\":%d,\"option\":%d}".formatted(userId, index, option);
		return mvc.perform(post("/api/duel/matches/{id}/answers", id).contentType(MediaType.APPLICATION_JSON)
			.content(body));
	}

	private JsonNode read(String body) {
		return json.readTree(body);
	}

	/** A clock the test moves by hand. */
	static final class MutableClock extends Clock {

		private Instant now;

		MutableClock(Instant now) {
			this.now = now;
		}

		void advance(Duration by) {
			now = now.plus(by);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}

	}

}
