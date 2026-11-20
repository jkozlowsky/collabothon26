package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import com.collabothon.back.TestcontainersConfiguration;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
		"app.duel.bot-min-delay-ms=15",
		"app.duel.bot-max-delay-ms=35",
		"app.duel.question-timeout-ms=5000",
		"app.duel.queue-tick-ms=100"
})
class DuelStompIntegrationTest {

	@LocalServerPort
	private int port;

	@Autowired
	private JsonMapper jsonMapper;
	@Autowired
	private SimpUserRegistry userRegistry;
	@Autowired
	private DuelCategoryRepository categories;
	@Autowired
	private DuelPlayerRepository players;
	@Autowired
	private DuelProgressRepository progress;
	@Autowired
	private DuelMatchRepository matches;
	@Autowired
	private DuelMatchQuestionRepository matchQuestions;
	@Autowired
	private DuelAnswerRepository answers;
	@Autowired
	private BotService botService;

	private final HttpClient http = HttpClient.newHttpClient();

	@Test
	void fullBotMatchOverStompAndMatchRestEndpoint() throws Exception {
		String userId = "stomp-bot-user";
		players.save(new DuelPlayer(userId, "Alex Tester", (short) 2));

		try (StompDuelTestClient client = connect(userId, "en")) {
			client.send("/app/duel/queue.join",
					Map.of("type", "queue.join", "category", "instruments", "mode", "BOT"));

			JsonNode start = client.awaitType("match.start");
			long matchId = start.get("matchId").longValue();
			assertThat(start.get("mode").stringValue()).isEqualTo("BOT");
			assertThat(start.get("category").stringValue()).isEqualTo("instruments");
			assertThat(start.get("questionCount").intValue()).isEqualTo(6);
			assertThat(start.get("you").get("name").stringValue()).isEqualTo("Alex Tester");
			assertThat(start.get("rival").get("isBot").booleanValue()).isTrue();
			assertThat(start.get("rival").get("elo").isNull()).isTrue();
			String botName = start.get("rival").get("name").stringValue();

			for (int idx = 0; idx < 6; idx++) {
				JsonNode q = client.awaitType("question");
				assertThat(q.get("index").intValue()).isEqualTo(idx);
				assertThat(q.get("options")).hasSize(4);
				assertThat(q.has("correctIndex")).isFalse();
				assertThat(q.has("correctOption")).isFalse();
				assertThat(q.has("explanation")).isFalse();

				client.send("/app/duel/answer", Map.of("matchId", matchId, "index", idx, "option", 0));
				JsonNode res = client.awaitType("answer.result");
				assertThat(res.get("index").intValue()).isEqualTo(idx);
				assertThat(res.get("timedOut").booleanValue()).isFalse();
				assertThat(res.has("correctOption")).isFalse();
			}

			JsonNode end = client.awaitType("match.end");
			assertThat(end.get("matchId").longValue()).isEqualTo(matchId);
			assertThat(end.get("mode").stringValue()).isEqualTo("BOT");
			assertThat(end.get("eloBefore").isNull()).isTrue();
			assertThat(end.get("eloAfter").isNull()).isTrue();
			assertThat(end.get("review")).hasSize(6);

			DuelMatch persisted = matches.findById(matchId).orElseThrow();
			assertThat(persisted.getStatus()).isEqualTo(DuelMatch.Status.FINISHED);
			assertThat(persisted.getBotName()).isEqualTo(botName);
			assertThat(matchQuestions.findByMatchIdOrderByPositionAsc(matchId)).hasSize(6);
			assertThat(answers.findByMatchIdAndUserIdOrderByPositionAsc(matchId, userId)).hasSize(6);
			assertThat(answers.findByMatchIdAndUserIdOrderByPositionAsc(matchId, botService.botUserId(botName)))
				.hasSize(6);

			DuelCategory instruments = categories.findBySlug("instruments").orElseThrow();
			DuelProgress prog = progress.findById(new DuelProgress.Key(userId, instruments.getId())).orElseThrow();
			assertThat(prog.getXp()).isEqualTo(end.get("xpGained").intValue());
			assertThat(prog.getElo()).isEqualTo(DuelProgress.STARTING_ELO);
			assertThat(prog.getHumanMatches()).isZero();

			JsonNode matchRest = getJson("/api/duel/matches/" + matchId + "?userId=" + userId + "&lang=pl");
			assertThat(matchRest.get("matchId").longValue()).isEqualTo(matchId);
			assertThat(matchRest.get("score").intValue()).isEqualTo(end.get("score").intValue());
			assertThat(matchRest.get("review")).hasSize(6);
		}
	}

	@Test
	void soloMatchSupportsDisconnectAndResumeOverStomp() throws Exception {
		String userId = "stomp-solo-resume-user";
		long matchId;

		try (StompDuelTestClient first = connect(userId, "en")) {
			first.send("/app/duel/queue.join", Map.of("category", "instruments", "mode", "SOLO"));
			JsonNode start = first.awaitType("match.start");
			matchId = start.get("matchId").longValue();
			assertThat(start.get("rival").isNull()).isTrue();

			assertThat(first.awaitType("question").get("index").intValue()).isEqualTo(0);
			first.send("/app/duel/answer", Map.of("matchId", matchId, "index", 0, "option", 1));
			first.awaitType("answer.result");
			assertThat(first.awaitType("question").get("index").intValue()).isEqualTo(1);
		}

		try (StompDuelTestClient resumed = connect(userId, "pl")) {
			resumed.send("/app/duel/match.resume", Map.of("matchId", matchId));
			JsonNode state = resumed.awaitType("match.state");
			assertThat(state.get("matchId").longValue()).isEqualTo(matchId);
			assertThat(state.get("yourResults")).hasSize(6);
			assertThat(state.get("yourResults").get(0).isNull()).isFalse();
			assertThat(state.get("yourResults").get(1).isNull()).isTrue();
			assertThat(state.get("question").get("index").intValue()).isEqualTo(1);
			assertThat(state.get("rivalProgress").isNull()).isTrue();

			for (int idx = 1; idx < 6; idx++) {
				resumed.send("/app/duel/answer", Map.of("matchId", matchId, "index", idx, "option", 2));
				assertThat(resumed.awaitType("answer.result").get("index").intValue()).isEqualTo(idx);
				if (idx < 5) {
					assertThat(resumed.awaitType("question").get("index").intValue()).isEqualTo(idx + 1);
				}
			}

			JsonNode end = resumed.awaitType("match.end");
			assertThat(end.get("outcome").stringValue()).isEqualTo("SOLO");
			assertThat(end.get("rivalScore").isNull()).isTrue();
			assertThat(end.get("eloBefore").isNull()).isTrue();
			assertThat(end.get("xpGained").intValue()).isEqualTo(end.get("score").intValue() * 8);
		}
	}

	@Test
	void humanMatchUpdatesEloAndRestEndpointsReturnExpectedShapes() throws Exception {
		String userA = "stomp-human-a";
		String userB = "stomp-human-b";
		players.save(new DuelPlayer(userA, "Ola Human", (short) 3));
		players.save(new DuelPlayer(userB, "Marek Human", (short) 4));

		DuelCategory instruments = categories.findBySlug("instruments").orElseThrow();
		DuelProgress pA = new DuelProgress(userA, instruments.getId());
		pA.applyMatch(100, 120, true);
		for (int i = 0; i < 4; i++) pA.applyMatch(0, 0, true);
		progress.save(pA);

		DuelProgress pB = new DuelProgress(userB, instruments.getId());
		pB.applyMatch(80, 100, true);
		for (int i = 0; i < 4; i++) pB.applyMatch(0, 0, true);
		progress.save(pB);

		try (StompDuelTestClient clientA = connect(userA, "en");
				StompDuelTestClient clientB = connect(userB, "pl")) {
			clientA.send("/app/duel/queue.join", Map.of("category", "instruments", "mode", "HUMAN"));
			assertThat(clientA.awaitType("queue.waiting").get("widened").booleanValue()).isFalse();

			clientB.send("/app/duel/queue.join", Map.of("category", "instruments", "mode", "HUMAN"));

			JsonNode startA = clientA.awaitType("match.start");
			JsonNode startB = clientB.awaitType("match.start");
			long matchId = startA.get("matchId").longValue();
			assertThat(startB.get("matchId").longValue()).isEqualTo(matchId);
			assertThat(startA.get("rival").get("name").stringValue()).isEqualTo("Marek Human");
			assertThat(startB.get("rival").get("name").stringValue()).isEqualTo("Ola Human");

			for (int idx = 0; idx < 6; idx++) {
				clientA.awaitType("question");
				clientB.awaitType("question");
				clientA.send("/app/duel/answer", Map.of("matchId", matchId, "index", idx, "option", 0));
				clientB.send("/app/duel/answer", Map.of("matchId", matchId, "index", idx, "option", 1));
				clientA.awaitType("answer.result");
				clientB.awaitType("answer.result");
			}

			JsonNode endA = clientA.awaitType("match.end");
			JsonNode endB = clientB.awaitType("match.end");
			assertThat(endA.get("eloBefore").intValue()).isEqualTo(1120);
			assertThat(endA.get("eloAfter").isNull()).isFalse();
			assertThat(endB.get("eloBefore").intValue()).isEqualTo(1100);
			assertThat(endB.get("eloAfter").isNull()).isFalse();

			JsonNode catsPl = getJson("/api/duel/categories?userId=" + userA + "&lang=pl");
			assertThat(catsPl).hasSize(5);
			assertThat(catsPl.get(0).get("name").stringValue()).isEqualTo("Instrumenty");
			assertThat(catsPl.get(0).get("calibrated").booleanValue()).isTrue();
			assertThat(catsPl.get(0).get("humanMatches").intValue()).isEqualTo(6);

			JsonNode catRank = getJson("/api/duel/rankings?scope=category&category=instruments&userId=" + userA);
			assertThat(catRank.get("me").get("elo").intValue()).isEqualTo(endA.get("eloAfter").intValue());
			assertThat(getJson("/api/duel/rankings?scope=overall&userId=" + userA).get("me").get("userId").stringValue())
				.isEqualTo(userA);
			assertThat(getJson("/api/duel/rankings?scope=friends&userId=" + userA).get("me").get("userId").stringValue())
				.isEqualTo(userA);

			JsonNode weeklyRank = getJson("/api/duel/rankings?scope=weekly&userId=" + userA);
			int expectedWeeklyDelta = endA.get("eloAfter").intValue() - endA.get("eloBefore").intValue();
			assertThat(weeklyRank.get("me").get("value").intValue()).isEqualTo(expectedWeeklyDelta);

			JsonNode progResp = getJson("/api/duel/progress/" + userA);
			assertThat(progResp).hasSize(5);
			assertThat(progResp.get(0).get("accuracyLast30d").isNumber()).isTrue();
			assertThat(progResp.get(1).get("accuracyLast30d").isNull()).isTrue();
		}
	}

	@Test
	void stompErrorsRouteToUserQueueAndMissingUserIdIsRejected() throws Exception {
		try (StompDuelTestClient client = connect("stomp-err-user", "en")) {
			client.send("/app/duel/queue.join", Map.of("category", "does-not-exist", "mode", "SOLO"));
			JsonNode err = client.awaitType("error");
			assertThat(err.get("code").stringValue()).isEqualTo("INVALID_REQUEST");
		}

		WebSocketStompClient raw = new WebSocketStompClient(new StandardWebSocketClient());
		try {
			assertThatThrownBy(() -> raw
				.connectAsync("ws://localhost:" + port + "/ws/duel", new WebSocketHttpHeaders(), new StompHeaders(),
						new StompSessionHandlerAdapter() {})
				.get(3, TimeUnit.SECONDS)).isInstanceOf(Exception.class);
		}
		finally {
			raw.stop();
		}
	}

	private StompDuelTestClient connect(String userId, String lang) throws Exception {
		return StompDuelTestClient.connect(port, userId, lang, jsonMapper, userRegistry);
	}

	private JsonNode getJson(String path) throws Exception {
		HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build();
		HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
		assertThat(resp.statusCode()).as("GET " + path + " body: " + resp.body()).isEqualTo(200);
		return jsonMapper.readTree(resp.body());
	}

}
