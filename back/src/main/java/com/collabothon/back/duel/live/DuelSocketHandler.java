package com.collabothon.back.duel.live;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.collabothon.back.profile.services.AccountSessionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The {@code /ws/duel} endpoint: parses and dispatches only. The connection takes {@code userId} and
 * {@code deviceId} query params and is dropped with {@code NOT_LOCKED} unless that device holds the account's lock.
 */
@Slf4j
@Component
@RequiredArgsConstructor
class DuelSocketHandler extends TextWebSocketHandler {

	private static final String USER_ID = "duel.userId";

	private static final String DEVICE_ID = "duel.deviceId";

	private final AccountSessionService accountSessions;

	private final DuelLiveNotifier notifier;

	private final DuelMatchmakingService matchmaking;

	private final DuelPresenceService presence;

	private final JsonMapper json;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		var params = UriComponentsBuilder.fromUri(session.getUri()).build().getQueryParams();
		String userId = params.getFirst("userId");
		String deviceId = params.getFirst("deviceId");
		if (!accountSessions.holdsLock(userId, deviceId)) {
			rejectUnlocked(session);
			return;
		}
		session.getAttributes().put(USER_ID, userId);
		session.getAttributes().put(DEVICE_ID, deviceId);
		notifier.register(userId, session);
	}

	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
		String userId = (String) session.getAttributes().get(USER_ID);
		if (userId == null) {
			return;
		}
		JsonNode node;
		try {
			node = json.readTree(message.getPayload());
		}
		catch (JacksonException e) {
			notifier.send(session, DuelSocketMessages.error("BAD_MESSAGE"));
			return;
		}
		switch (node.path("type").asString("")) {
			case "queue" -> queue(session, userId, node);
			case "cancel" -> matchmaking.cancel(userId);
			case "ping" -> notifier.send(session, DuelSocketMessages.pong());
			default -> notifier.send(session, DuelSocketMessages.error("BAD_MESSAGE"));
		}
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
		String userId = (String) session.getAttributes().get(USER_ID);
		if (userId == null) {
			return;
		}
		notifier.unregister(userId, session);
		if (!notifier.isConnected(userId)) {
			matchmaking.cancel(userId);
			presence.onDisconnected(userId);
		}
	}

	private void queue(WebSocketSession session, String userId, JsonNode node) throws Exception {
		String deviceId = (String) session.getAttributes().get(DEVICE_ID);
		if (!accountSessions.holdsLock(userId, deviceId)) {
			rejectUnlocked(session);
			return;
		}
		List<String> categories = new ArrayList<>();
		node.path("categories").forEach(category -> categories.add(category.asString()));
		matchmaking.join(userId, categories);
	}

	private void rejectUnlocked(WebSocketSession session) throws Exception {
		notifier.send(session, DuelSocketMessages.error("NOT_LOCKED"));
		session.close(CloseStatus.POLICY_VIOLATION);
	}

}
