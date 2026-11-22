package com.collabothon.back.duel.live;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.web.client.RestClient;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.duel.services.DuelShuffle;
import com.collabothon.back.profile.services.AccountSessionService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Two real WebSocket clients, signed in as two demo accounts, play one live duel through socket and REST. */
@Import({ TestcontainersConfiguration.class, DuelLiveSocketIntegrationTests.TimersConfig.class })
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DuelLiveSocketIntegrationTests {

	static final TestClock CLOCK = new TestClock(Instant.parse("2026-11-23T10:00:00Z"));

	@TestBean
	Clock clock;

	static Clock clock() {
		return CLOCK;
	}

	@TestConfiguration
	static class TimersConfig {

		@Bean
		@Primary
		ManualDuelTimers manualDuelTimers() {
			return new ManualDuelTimers();
		}

	}

	@LocalServerPort
	int port;

	@Autowired
	JsonMapper json;

	@Autowired
	AccountSessionService accountSessions;

	@Autowired
	DuelContentRepository content;

	@Autowired
	ManualDuelTimers timers;

	final List<WebSocketSession> open = new ArrayList<>();

	@BeforeEach
	void lockAccounts() {
		accountSessions.acquireSession("demo-daniel", "device-daniel");
		accountSessions.acquireSession("demo-elena", "device-elena");
		accountSessions.acquireSession("demo-user", "device-alex");
	}

	@Test
	void twoPlayersMatchPlayAndOneWinsWhileTheOtherLoses() throws Exception {
		Client daniel = connect("demo-daniel", "device-daniel");
		Client elena = connect("demo-elena", "device-elena");

		daniel.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		assertThat(daniel.next().path("type").asString()).isEqualTo("queued");
		elena.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		JsonNode danielMatched = daniel.next();
		JsonNode elenaMatched = elena.next();

		assertThat(danielMatched.path("type").asString()).isEqualTo("matched");
		assertThat(elenaMatched.path("type").asString()).isEqualTo("matched");
		long danielMatch = danielMatched.path("matchId").asLong();
		long elenaMatch = elenaMatched.path("matchId").asLong();
		assertThat(danielMatch).isNotEqualTo(elenaMatch);
		assertThat(danielMatched.path("rival").path("name").asString()).contains("Elena");
		assertThat(elenaMatched.path("rival").path("name").asString()).contains("Daniel");
		assertThat(danielMatched.path("categories").size()).isEqualTo(1);

		JsonNode danielQuestion = state(danielMatch, "demo-daniel").path("question");
		JsonNode elenaQuestion = state(elenaMatch, "demo-elena").path("question");
		assertThat(state(danielMatch, "demo-daniel").path("live").asBoolean()).isTrue();

		for (int index = 0; index < 6; index++) {
			assertThat(danielQuestion.path("step").path("id")).isEqualTo(elenaQuestion.path("step").path("id"));
			JsonNode danielResult = answer(danielMatch, "demo-daniel", index, danielQuestion, true);
			if (index == 0) {
				JsonNode progress = elena.next();
				assertThat(progress.path("type").asString()).isEqualTo("rival-progress");
				assertThat(progress.path("matchId").asLong()).isEqualTo(elenaMatch);
				assertThat(progress.path("answered").asInt()).isEqualTo(1);
				assertThat(progress.path("results").get(0).asBoolean()).isTrue();
			}
			danielQuestion = danielResult.path("nextQuestion");
			JsonNode elenaResult = answer(elenaMatch, "demo-elena", index, elenaQuestion, false);
			elenaQuestion = elenaResult.path("nextQuestion");
			if (index == 5) {
				assertThat(elenaResult.path("finished").asBoolean()).isTrue();
			}
		}

		assertThat(elena.drainUntil("rival-finished").path("rivalScore").asInt()).isEqualTo(6);
		assertThat(daniel.drainUntil("rival-finished").path("rivalScore").asInt()).isEqualTo(0);
		JsonNode danielEnd = result(danielMatch, "demo-daniel");
		JsonNode elenaEnd = result(elenaMatch, "demo-elena");
		assertThat(danielEnd.path("outcome").asString()).isEqualTo("WIN");
		assertThat(danielEnd.path("score").asInt()).isEqualTo(6);
		assertThat(danielEnd.path("rivalScore").asInt()).isEqualTo(0);
		assertThat(elenaEnd.path("outcome").asString()).isEqualTo("LOSS");
		assertThat(elenaEnd.path("rivalScore").asInt()).isEqualTo(6);
	}

	@Test
	void demoUserVersusAnotherPlayerBothGetRiskAndTheSameFixedSet() throws Exception {
		Client alex = connect("demo-user", "device-alex");
		Client daniel = connect("demo-daniel", "device-daniel");
		alex.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		assertThat(alex.next().path("type").asString()).isEqualTo("queued");
		daniel.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		JsonNode alexMatched = alex.next();
		JsonNode danielMatched = daniel.next();
		long alexMatch = alexMatched.path("matchId").asLong();
		long danielMatch = danielMatched.path("matchId").asLong();

		List<String> alexCategories = new ArrayList<>();
		alexMatched.path("categories").forEach(c -> alexCategories.add(c.asString()));
		assertThat(alexCategories).contains("risk");

		JsonNode alexQuestion = state(alexMatch, "demo-user").path("question");
		JsonNode danielQuestion = state(danielMatch, "demo-daniel").path("question");
		List<String> alexSteps = new ArrayList<>();
		List<String> danielSteps = new ArrayList<>();
		for (int index = 0; index < 6; index++) {
			alexSteps.add(alexQuestion.path("step").path("id").asString());
			danielSteps.add(danielQuestion.path("step").path("id").asString());
			alexQuestion = answer(alexMatch, "demo-user", index, alexQuestion, true).path("nextQuestion");
			danielQuestion = answer(danielMatch, "demo-daniel", index, danielQuestion, true).path("nextQuestion");
		}
		assertThat(danielSteps).isEqualTo(alexSteps);
	}

	@Test
	void equalScoresEndInADrawForBothPlayers() throws Exception {
		Client daniel = connect("demo-daniel", "device-daniel");
		Client elena = connect("demo-elena", "device-elena");
		daniel.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		assertThat(daniel.next().path("type").asString()).isEqualTo("queued");
		elena.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		long danielMatch = daniel.next().path("matchId").asLong();
		long elenaMatch = elena.next().path("matchId").asLong();

		JsonNode danielQuestion = state(danielMatch, "demo-daniel").path("question");
		JsonNode elenaQuestion = state(elenaMatch, "demo-elena").path("question");
		for (int index = 0; index < 6; index++) {
			danielQuestion = answer(danielMatch, "demo-daniel", index, danielQuestion, true).path("nextQuestion");
			elenaQuestion = answer(elenaMatch, "demo-elena", index, elenaQuestion, true).path("nextQuestion");
		}

		JsonNode danielEnd = result(danielMatch, "demo-daniel");
		JsonNode elenaEnd = result(elenaMatch, "demo-elena");
		assertThat(danielEnd.path("outcome").asString()).isEqualTo("DRAW");
		assertThat(elenaEnd.path("outcome").asString()).isEqualTo("DRAW");
		assertThat(danielEnd.path("score").asInt()).isEqualTo(6);
		assertThat(danielEnd.path("rivalScore").asInt()).isEqualTo(6);
		assertThat(elenaEnd.path("rivalScore").asInt()).isEqualTo(6);
	}

	@Test
	void aLoneClientGetsNoRivalAfterFifteenSeconds() throws Exception {
		Client alex = connect("demo-user", "device-alex");
		alex.send("{\"type\":\"queue\",\"categories\":[\"saving\"]}");
		assertThat(alex.next().path("type").asString()).isEqualTo("queued");

		CLOCK.advance(Duration.ofSeconds(15));
		timers.runAll();

		assertThat(alex.next().path("type").asString()).isEqualTo("no-rival");
	}

	@Test
	void aSocketWithoutTheAccountLockIsRejected() throws Exception {
		Client intruder = connect("demo-daniel", "some-other-device");

		assertThat(intruder.next().path("code").asString()).isEqualTo("NOT_LOCKED");
		assertThat(intruder.closed.poll(5, TimeUnit.SECONDS)).isEqualTo(CloseStatus.POLICY_VIOLATION);
	}

	private Client connect(String userId, String deviceId) throws Exception {
		Client client = new Client();
		String url = "ws://localhost:" + port + "/ws/duel?userId=" + userId + "&deviceId=" + deviceId;
		WebSocketSession session = new StandardWebSocketClient().execute(client, url).get(10, TimeUnit.SECONDS);
		client.session = session;
		open.add(session);
		return client;
	}

	private RestClient rest() {
		return RestClient.create("http://localhost:" + port);
	}

	private JsonNode state(long matchId, String userId) {
		return json.readTree(rest().get().uri("/api/duel/matches/{id}/state?userId={u}", matchId, userId).retrieve()
			.body(String.class));
	}

	private JsonNode result(long matchId, String userId) {
		return json.readTree(rest().get().uri("/api/duel/matches/{id}?userId={u}", matchId, userId).retrieve()
			.body(String.class));
	}

	private JsonNode answer(long matchId, String userId, int index, JsonNode question, boolean correct) {
		return json.readTree(rest().post().uri("/api/duel/matches/{id}/answers", matchId)
			.contentType(MediaType.APPLICATION_JSON)
			.body(answerBody(userId, index, matchId, question, correct))
			.retrieve()
			.body(String.class));
	}

	private java.util.Optional<com.collabothon.back.entities.duel.DuelQuestion> findServed(JsonNode servedStep) {
		return java.util.stream.Stream.of("money-basics", "saving", "borrowing", "investing", "risk")
			.flatMap(area -> content.findByStory(area).stream())
			.filter(q -> q.step().path("prompt").asString().equals(servedStep.path("prompt").asString()))
			.findFirst();
	}

	/** The request body of a right or wrong answer to {@code question}, graded against the player's own shuffle. */
	private String answerBody(String userId, int index, long matchId, JsonNode question, boolean correct) {
		var step = findServed(question.path("step")).orElseThrow();
		String head = "{\"userId\":\"" + userId + "\",\"index\":" + index + ",";
		return switch (step.type()) {
			case "quiz" -> {
				int right = step.step().path("correctIndex").asInt();
				yield head + "\"option\":" + (correct ? right : (right + 1) % 4) + "}";
			}
			case "predict", "chart" -> {
				double target = step.step().path("answer").asDouble();
				yield head + "\"value\":" + (correct ? target : target + 50000) + "}";
			}
			case "sort" -> {
				var items = step.step().path("items");
				List<Integer> buckets = new ArrayList<>(DuelShuffle.sortPermutation(matchId, index, items.size())
					.stream().map(i -> items.get(i).path("bucket").asInt()).toList());
				if (!correct) {
					buckets.set(0, 1 - buckets.get(0));
				}
				yield head + "\"buckets\":" + buckets + "}";
			}
			default -> {
				int size = step.step().path("pairs").size();
				var perms = DuelShuffle.matchPermutations(matchId, index, size);
				List<Integer> pairs = new ArrayList<>();
				for (int i = 0; i < size; i++) {
					pairs.add(perms.right().indexOf(perms.left().get(i)));
				}
				if (!correct) {
					pairs.add(0, pairs.remove(1));
				}
				yield head + "\"pairs\":" + pairs + "}";
			}
		};
	}

	private class Client extends TextWebSocketHandler {

		final BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();

		final BlockingQueue<CloseStatus> closed = new LinkedBlockingQueue<>();

		volatile WebSocketSession session;

		@Override
		protected void handleTextMessage(WebSocketSession session, TextMessage message) {
			messages.add(json.readTree(message.getPayload()));
		}

		@Override
		public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
			closed.add(status);
		}

		void send(String text) throws Exception {
			session.sendMessage(new TextMessage(text));
		}

		JsonNode next() throws Exception {
			JsonNode message = messages.poll(10, TimeUnit.SECONDS);
			assertThat(message).as("a socket message within 10 s").isNotNull();
			return message;
		}

		/** The next message of this type, skipping the rival-progress pushes before it. */
		JsonNode drainUntil(String type) throws Exception {
			JsonNode message;
			do {
				message = next();
			}
			while (!type.equals(message.path("type").asString()));
			return message;
		}

	}

}
