package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.user.SimpUserRegistry;

import com.collabothon.back.TestcontainersConfiguration;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
		"app.duel.bot-min-delay-ms=10",
		"app.duel.bot-max-delay-ms=20",
		"app.duel.question-timeout-ms=120",
		"app.duel.queue-tick-ms=40",
		"app.duel.queue-widen-sec=3",
		"app.duel.queue-bot-offer-sec=5"
})
class DuelStompLifecycleIntegrationTest {

	@LocalServerPort
	private int port;

	@Autowired
	private JsonMapper jsonMapper;
	@Autowired
	private SimpUserRegistry userRegistry;
	@Autowired
	private DuelCategoryRepository categories;
	@Autowired
	private DuelProgressRepository progress;
	@Autowired
	private DuelMatchRepository matches;
	@Autowired
	private DuelAnswerRepository answers;

	@Test
	void queueSendsBotOfferAndAcceptBotStartsBotMatch() throws Exception {
		try (StompDuelTestClient client = connect("stomp-bot-offer-user")) {
			client.send("/app/duel/queue.join", Map.of("category", "risk", "mode", "HUMAN"));
			JsonNode offer = client.awaitType("queue.botOffer");
			assertThat(offer.get("type").stringValue()).isEqualTo("queue.botOffer");

			client.send("/app/duel/queue.acceptBot", Map.of());
			JsonNode start = client.awaitType("match.start");
			assertThat(start.get("mode").stringValue()).isEqualTo("BOT");
			assertThat(start.get("rival").get("isBot").booleanValue()).isTrue();
		}
	}

	@Test
	void queueWidensAfterWindowToMatchDistantElos() throws Exception {
		DuelCategory risk = categories.findBySlug("risk").orElseThrow();
		DuelProgress high = new DuelProgress("stomp-high-elo", risk.getId());
		high.applyMatch(0, 500, true); // 1500
		progress.save(high);

		DuelProgress low = new DuelProgress("stomp-low-elo", risk.getId());
		low.applyMatch(0, -100, true); // 900 (diff 600 > 150)
		progress.save(low);

		try (StompDuelTestClient cHigh = connect("stomp-high-elo");
				StompDuelTestClient cLow = connect("stomp-low-elo")) {
			cHigh.send("/app/duel/queue.join", Map.of("category", "risk", "mode", "HUMAN"));
			cLow.send("/app/duel/queue.join", Map.of("category", "risk", "mode", "HUMAN"));

			JsonNode w1 = cHigh.awaitType("queue.waiting");
			assertThat(w1.get("widened").booleanValue()).isFalse();

			JsonNode startHigh = cHigh.awaitType("match.start");
			JsonNode startLow = cLow.awaitType("match.start");
			assertThat(startHigh.get("matchId").longValue()).isEqualTo(startLow.get("matchId").longValue());
		}
	}

	@Test
	void timeoutsAdvanceQuestionsAndDisconnectedSoloEndsAbandonedWithoutXp() throws Exception {
		String userId = "stomp-abandon-user";
		DuelCategory risk = categories.findBySlug("risk").orElseThrow();
		long matchId;

		try (StompDuelTestClient client = connect(userId)) {
			client.send("/app/duel/queue.join", Map.of("category", "risk", "mode", "SOLO"));
			matchId = client.awaitType("match.start").get("matchId").longValue();

			JsonNode timedOut = client.awaitType("answer.result");
			assertThat(timedOut.get("index").intValue()).isEqualTo(0);
			assertThat(timedOut.get("correct").booleanValue()).isFalse();
			assertThat(timedOut.get("timedOut").booleanValue()).isTrue();
		}

		DuelMatch persisted = null;
		long deadline = System.currentTimeMillis() + 3_000L;
		while (System.currentTimeMillis() < deadline) {
			persisted = matches.findById(matchId).orElseThrow();
			if (persisted.getStatus() == DuelMatch.Status.ABANDONED) {
				break;
			}
			Thread.sleep(50);
		}
		assertThat(persisted).isNotNull();
		assertThat(persisted.getStatus()).isEqualTo(DuelMatch.Status.ABANDONED);
		assertThat(persisted.getXpA()).isNull();
		assertThat(answers.findByMatchIdAndUserIdOrderByPositionAsc(matchId, userId))
			.hasSize(6)
			.allSatisfy(a -> {
				assertThat(a.getOutcome()).isEqualTo(DuelAnswer.Outcome.TIMEOUT);
				assertThat(a.getChosenIndex()).isNull();
				assertThat(a.isCorrect()).isFalse();
			});
		assertThat(progress.findById(new DuelProgress.Key(userId, risk.getId()))).isEmpty();
	}

	private StompDuelTestClient connect(String userId) throws Exception {
		return StompDuelTestClient.connect(port, userId, "en", jsonMapper, userRegistry);
	}

}
