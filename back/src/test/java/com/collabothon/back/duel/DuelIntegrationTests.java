package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.collabothon.back.MutableClock;
import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.duel.consts.DuelStepConsts;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.models.MatchPermutations;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.duel.services.DuelShuffle;
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

	@Autowired
	DuelContentRepository contentRepository;

	private Optional<DuelQuestion> findServed(JsonNode servedStep) {
		return Stream.of("money-basics", "saving", "borrowing", "investing", "risk")
			.flatMap(area -> contentRepository.findByArea(area).stream())
			.filter(q -> q.step().path("prompt").asString().equals(servedStep.path("prompt").asString()))
			.findFirst();
	}

	private String answerForQuestion(String userId, int index, long matchId, JsonNode questionNode, boolean correct) {
		JsonNode step = questionNode.path("step");
		Optional<DuelQuestion> questionOpt = findServed(step);
		if (questionOpt.isEmpty()) {
			return "{\"userId\":\"" + userId + "\",\"index\":" + index + ",\"option\":0}";
		}
		DuelQuestion q = questionOpt.get();
		String type = q.type();
		if (DuelStepConsts.QUIZ.equals(type)) {
			int opt = correct ? q.step().path("correctIndex").asInt() : (q.step().path("correctIndex").asInt() + 1) % 4;
			return "{\"userId\":\"" + userId + "\",\"index\":" + index + ",\"option\":" + opt + "}";
		}
		if (DuelStepConsts.PREDICT.equals(type) || DuelStepConsts.CHART.equals(type)) {
			double target = q.step().path("answer").asDouble();
			double val = correct ? target : target + 50000;
			return "{\"userId\":\"" + userId + "\",\"index\":" + index + ",\"value\":" + val + "}";
		}
		if (DuelStepConsts.SORT.equals(type)) {
			JsonNode items = q.step().path("items");
			List<Integer> buckets = DuelShuffle.sortPermutation(matchId, index, items.size()).stream()
				.map(i -> items.get(i).path("bucket").asInt()).toList();
			return "{\"userId\":\"" + userId + "\",\"index\":" + index + ",\"buckets\":" + buckets + "}";
		}
		if (DuelStepConsts.MATCH.equals(type)) {
			int size = q.step().path("pairs").size();
			MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, size);
			List<Integer> pairs = new ArrayList<>();
			for (int i = 0; i < size; i++) {
				pairs.add(perms.right().indexOf(perms.left().get(i)));
			}
			return "{\"userId\":\"" + userId + "\",\"index\":" + index + ",\"pairs\":" + pairs + "}";
		}
		return "{\"userId\":\"" + userId + "\",\"index\":" + index + ",\"option\":0}";
	}

	@Test
	void categoriesReturnsStoriesInOrderWithFullNamesAndLevels() throws Exception {
		mvc.perform(get("/api/duel/categories").param("userId", "demo-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].story").value("money-basics"))
			.andExpect(jsonPath("$[0].name").value("Money basics"))
			.andExpect(jsonPath("$[1].story").value("saving"))
			.andExpect(jsonPath("$[1].name").value("Saving"))
			.andExpect(jsonPath("$[2].story").value("borrowing"))
			.andExpect(jsonPath("$[2].name").value("Borrowing"))
			.andExpect(jsonPath("$[3].story").value("investing"))
			.andExpect(jsonPath("$[3].name").value("Investing"))
			.andExpect(jsonPath("$[4].story").value("risk"))
			.andExpect(jsonPath("$[4].name").value("Risk"))
			.andExpect(jsonPath("$[4].color").value("violet"));
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
			.content("{\"userId\":\"player-solo\",\"categories\":[\"saving\"],\"mode\":\"SOLO\"}"))
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
			.content("{\"userId\":\"player-human\",\"categories\":[\"saving\",\"risk\"],\"mode\":\"HUMAN\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mode").value("HUMAN"))
			.andExpect(jsonPath("$.rival.name").exists())
			.andExpect(jsonPath("$.rival.avatar").exists())
			.andExpect(jsonPath("$.rival.levels.saving").exists())
			.andExpect(jsonPath("$.you.levels.saving").exists());
	}

	@Test
	void soloMatchFullFlowAnswersTimeoutsAndZeroXp() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T12:00:00Z"));
		String startRes = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"solo-runner\",\"categories\":[\"saving\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		JsonNode startJson = json.readTree(startRes);
		long matchId = startJson.get("matchId").asLong();
		JsonNode q0 = startJson.get("question");

		// Cannot get result while in progress -> 409
		mvc.perform(get("/api/duel/matches/{id}", matchId).param("userId", "solo-runner"))
			.andExpect(status().isConflict());

		// Question 0: right answer
		String a0 = mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 0, matchId, q0, true)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.index").value(0))
			.andExpect(jsonPath("$.correct").value(true))
			.andExpect(jsonPath("$.timedOut").value(false))
			.andExpect(jsonPath("$.nextQuestion.index").value(1))
			.andExpect(jsonPath("$.finished").value(false))
			.andReturn().getResponse().getContentAsString();
		JsonNode q1 = json.readTree(a0).get("nextQuestion");

		// Idempotency: re-submitting index 0 returns same result
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 0, matchId, q0, true)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.index").value(0))
			.andExpect(jsonPath("$.correct").value(true));

		// Question 1: right answer
		CLOCK.advance(Duration.ofSeconds(3));
		String a1 = mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 1, matchId, q1, true)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(true))
			.andReturn().getResponse().getContentAsString();
		JsonNode q2 = json.readTree(a1).get("nextQuestion");

		// Question 2: wrong answer
		CLOCK.advance(Duration.ofSeconds(2));
		String a2 = mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 2, matchId, q2, false)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(false))
			.andReturn().getResponse().getContentAsString();
		JsonNode q3 = json.readTree(a2).get("nextQuestion");

		// Question 3: advance clock by 100 seconds to test timeout!
		CLOCK.advance(Duration.ofSeconds(100));
		String a3 = mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 3, matchId, q3, true)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.timedOut").value(true))
			.andExpect(jsonPath("$.correct").value(false))
			.andReturn().getResponse().getContentAsString();
		JsonNode q4 = json.readTree(a3).get("nextQuestion");

		// Question 4: correct
		CLOCK.advance(Duration.ofSeconds(5));
		String a4 = mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 4, matchId, q4, true)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(true))
			.andReturn().getResponse().getContentAsString();
		JsonNode q5 = json.readTree(a4).get("nextQuestion");

		// Question 5: correct (final question)
		CLOCK.advance(Duration.ofSeconds(5));
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content(answerForQuestion("solo-runner", 5, matchId, q5, true)))
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
			.andExpect(jsonPath("$.you.name").exists())
			.andExpect(jsonPath("$.you.avatar").exists())
			.andExpect(jsonPath("$.xpGained").value(0))
			.andExpect(jsonPath("$.categories.length()").value(0))
			.andExpect(jsonPath("$.review.length()").value(6))
			.andExpect(jsonPath("$.review[0].lessonTitle").exists())
			.andExpect(jsonPath("$.review[3].yourAnswer").doesNotExist()); // timed out
	}

	@Test
	void humanMatchAwards5XpPerCorrectAnswerAndRecordsInXpEvent() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T14:00:00Z"));
		String startRes = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"human-player\",\"categories\":[\"saving\"],\"mode\":\"HUMAN\"}"))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		JsonNode humanStart = json.readTree(startRes);
		long matchId = humanStart.get("matchId").asLong();
		JsonNode curQ = humanStart.get("question");

		// Answer all 6 questions correctly
		for (int i = 0; i < 6; i++) {
			MvcResult mvcResult = mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(answerForQuestion("human-player", i, matchId, curQ, true)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.correct").value(true))
				.andReturn();
			JsonNode ansJson = json.readTree(mvcResult.getResponse().getContentAsString());
			if (i < 5) {
				curQ = ansJson.get("nextQuestion");
			} else {
				assertThat(ansJson.get("yourFinal").get("score").asInt()).isEqualTo(6);
				assertThat(ansJson.get("yourFinal").get("xpGained").asInt()).isEqualTo(30);
			}
		}

		// XP was written immediately upon finishing (before rival is settled)
		int totalXp = xpService.totalXp("human-player");
		assertThat(totalXp).isEqualTo(30);

		int berlinXp = xpService.xpPerCategory("human-player").get("saving");
		assertThat(berlinXp).isEqualTo(30);

		// Advance clock by 10 seconds to allow rival's last answer to arrive
		CLOCK.advance(Duration.ofSeconds(10));

		// Settle and check result
		mvc.perform(get("/api/duel/matches/{id}", matchId).param("userId", "human-player"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.score").value(6))
			.andExpect(jsonPath("$.rivalScore").value(5)) // rival scored max(6 - 1, 0) = 5
			.andExpect(jsonPath("$.outcome").value("WIN"))
			.andExpect(jsonPath("$.you.name").exists())
			.andExpect(jsonPath("$.you.avatar").exists())
			.andExpect(jsonPath("$.rival.name").exists())
			.andExpect(jsonPath("$.rival.avatar").exists())
			.andExpect(jsonPath("$.xpGained").value(30))
			.andExpect(jsonPath("$.xpByCategory.saving").value(30))
			.andExpect(jsonPath("$.categories[0].story").value("saving"))
			.andExpect(jsonPath("$.categories[0].xpGained").value(30))
			.andExpect(jsonPath("$.categories[0].xpBefore").value(0))
			.andExpect(jsonPath("$.categories[0].xpAfter").value(30));

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
			.content("{\"userId\":\"hist-player\",\"categories\":[\"saving\"],\"mode\":\"SOLO\"}"))
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
			.content("{\"userId\":\"hist-player\",\"categories\":[\"saving\"],\"mode\":\"SOLO\"}"))
			.andReturn().getResponse().getContentAsString();
		long m2 = json.readTree(s2).get("matchId").asLong();

		// Match 3: unfinished (newer)
		CLOCK.advance(Duration.ofMinutes(5));
		String s3 = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"hist-player\",\"categories\":[\"saving\"],\"mode\":\"SOLO\"}"))
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
			.andExpect(jsonPath("$.length()").value(7))
			.andExpect(jsonPath("$[1].category").value("berlin"))
			.andExpect(jsonPath("$[1].xp").value(50))
			.andExpect(jsonPath("$[1].weeklyXp").value(50));
	}

	@Test
	void lessonCompletionWritesXpEventAndUpdatesTotalXp() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T20:00:00Z"));

		// Complete lesson berlin-1 (mission 1, 60 XP)
		mvc.perform(post("/api/lessons/berlin-1/result").param("userId", "lesson-tester")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"steps\":[],\"completedOn\":\"2026-11-23\",\"mode\":\"classic\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.xpAwarded").value(60))
			.andExpect(jsonPath("$.firstCompletion").value(true))
			.andExpect(jsonPath("$.totalXp").value(60));

		// Verify xp_event row was written
		int count = jdbc.sql("SELECT COUNT(*) FROM xp_event WHERE user_id = 'lesson-tester' AND source = 'LESSON' AND category = 'berlin'")
			.query(Integer.class)
			.single();
		assertThat(count).isEqualTo(1);

		// AccountController stats returns totalXp from xp_event
		mvc.perform(get("/api/users/lesson-tester/stats").param("today", "2026-11-23"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalXp").value(60))
			.andExpect(jsonPath("$.lessonsCompleted").value(1));
	}

	@Test
	void sortAndMatchPartialWrongAreGradedFalse() throws Exception {
		CLOCK.set(Instant.parse("2026-11-23T22:00:00Z"));
		String startRes = mvc.perform(post("/api/duel/matches")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"pw-tester\",\"categories\":[\"saving\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		long matchId = json.readTree(startRes).get("matchId").asLong();

		// Answer Q0..Q3
		for (int i = 0; i < 4; i++) {
			mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"userId\":\"pw-tester\",\"index\":" + i + ",\"option\":0}"));
		}

		// Q4: sort with 1 wrong bucket
		List<Integer> sortBuckets = new ArrayList<>(sortBucketsForBerlin(matchId));
		sortBuckets.set(0, 1 - sortBuckets.get(0)); // invert one bucket
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"pw-tester\",\"index\":4,\"buckets\":" + sortBuckets + "}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(false));

		// Q5: match with swapped pairs
		List<Integer> matchPairs = new ArrayList<>(matchPairsForBerlin(matchId));
		int temp = matchPairs.get(0);
		matchPairs.set(0, matchPairs.get(1));
		matchPairs.set(1, temp);
		mvc.perform(post("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"pw-tester\",\"index\":5,\"pairs\":" + matchPairs + "}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.correct").value(false));
	}

	private static List<Integer> sortBucketsForBerlin(long matchId) {
		return sortBucketsForBerlin(matchId, 4);
	}

	private static List<Integer> sortBucketsForBerlin(long matchId, int index) {
		List<Integer> perm = DuelShuffle.sortPermutation(matchId, index, 6);
		return perm.stream().map(idx -> (idx % 2 == 0) ? 0 : 1).toList();
	}

	private static List<Integer> matchPairsForBerlin(long matchId) {
		return matchPairsForBerlin(matchId, 5);
	}

	private static List<Integer> matchPairsForBerlin(long matchId, int index) {
		MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, 4);
		List<Integer> pairs = new ArrayList<>();
		for (int i = 0; i < 4; i++) {
			pairs.add(perms.right().indexOf(perms.left().get(i)));
		}
		return pairs;
	}

}
