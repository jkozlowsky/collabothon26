package com.collabothon.back.duel;

import java.lang.reflect.Type;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.simp.user.SimpSubscription;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Real STOMP-over-native-WebSocket test client backed by Spring's
 * {@link WebSocketStompClient} for end-to-end duel integration tests.
 */
final class StompDuelTestClient implements AutoCloseable {

	private final WebSocketStompClient stompClient;
	private final StompSession session;
	private final BlockingQueue<JsonNode> incoming = new LinkedBlockingQueue<>();

	private StompDuelTestClient(WebSocketStompClient stompClient, StompSession session) {
		this.stompClient = stompClient;
		this.session = session;
	}

	static StompDuelTestClient connect(int port, String userId, String lang, JsonMapper jsonMapper,
			SimpUserRegistry userRegistry) throws Exception {
		WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
		client.setMessageConverter(new JacksonJsonMessageConverter(jsonMapper));

		StompHeaders connectHeaders = new StompHeaders();
		if (userId != null) {
			connectHeaders.add("userId", userId);
		}
		if (lang != null) {
			connectHeaders.add("lang", lang);
		}

		StompSession session = client
			.connectAsync("ws://localhost:" + port + "/ws/duel", new WebSocketHttpHeaders(), connectHeaders,
					new StompSessionHandlerAdapter() {
						@Override
						public void handleException(StompSession s, StompCommand command, StompHeaders headers,
								byte[] payload, Throwable exception) {
							throw new RuntimeException("STOMP client error on " + command, exception);
						}
					})
			.get(5, TimeUnit.SECONDS);

		StompDuelTestClient wrapper = new StompDuelTestClient(client, session);
		session.subscribe("/user/queue/duel", new StompFrameHandler() {
			@Override
			public Type getPayloadType(StompHeaders headers) {
				return JsonNode.class;
			}

			@Override
			public void handleFrame(StompHeaders headers, Object payload) {
				if (payload instanceof JsonNode node) {
					wrapper.incoming.add(node);
				}
			}
		});

		awaitSubscriptionRegistered(userRegistry, userId);
		return wrapper;
	}

	void send(String destination, Object payload) {
		session.send(destination, payload);
	}

	JsonNode awaitType(String expectedType) throws InterruptedException {
		long deadline = System.currentTimeMillis() + 5_000L;
		while (System.currentTimeMillis() < deadline) {
			long remaining = deadline - System.currentTimeMillis();
			JsonNode msg = incoming.poll(Math.max(1L, remaining), TimeUnit.MILLISECONDS);
			if (msg == null) {
				break;
			}
			String type = msg.hasNonNull("type") ? msg.get("type").stringValue() : "";
			if (expectedType.equals(type)) {
				return msg;
			}
		}
		throw new AssertionError("Timed out waiting for STOMP message type '" + expectedType + "' at " + Instant.now());
	}

	@Override
	public void close() {
		try {
			if (session.isConnected()) {
				session.disconnect();
			}
		}
		catch (Exception ignored) {
		}
		stompClient.stop();
	}

	private static void awaitSubscriptionRegistered(SimpUserRegistry registry, String userId)
			throws InterruptedException {
		if (userId == null) {
			return;
		}
		long deadline = System.currentTimeMillis() + 3_000L;
		while (System.currentTimeMillis() < deadline) {
			SimpUser user = registry.getUser(userId);
			if (user != null) {
				boolean subscribed = user.getSessions()
					.stream()
					.flatMap(s -> s.getSubscriptions().stream())
					.map(SimpSubscription::getDestination)
					.anyMatch(dest -> dest != null && dest.contains("/queue/duel"));
				if (subscribed) {
					return;
				}
			}
			Thread.sleep(10);
		}
		throw new AssertionError("Timed out waiting for /user/queue/duel subscription for user " + userId);
	}

}
