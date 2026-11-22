package com.collabothon.back.duel.live;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.collabothon.back.duel.consts.DuelSocketConsts;
import com.collabothon.back.profile.services.AccountSessionService;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Parses and dispatches. A socket is accepted only from the device that holds the account's lock. */
@Component
@RequiredArgsConstructor
class DuelSocketHandler extends TextWebSocketHandler {

	private final AccountSessionService accountSessions;

	private final DuelLiveNotifier notifier;

	private final DuelMatchmakingService matchmaking;

	private final DuelPresenceService presence;

	private final JsonMapper json;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws IOException {
		MultiValueMap<String, String> params = UriComponentsBuilder.fromUri(session.getUri()).build().getQueryParams();
		String userId = params.getFirst("userId");
		String deviceId = params.getFirst("deviceId");
		if (!accountSessions.holdsLock(userId, deviceId)) {
			rejectUnlocked(session);
			return;
		}
		session.getAttributes().put(DuelSocketConsts.USER_ID_ATTRIBUTE, userId);
		session.getAttributes().put(DuelSocketConsts.DEVICE_ID_ATTRIBUTE, deviceId);
		notifier.register(userId, session);
	}

	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
		if (!isAccepted(session)) {
			return;
		}
		JsonNode node;
		try {
			node = json.readTree(message.getPayload());
		}
		catch (JacksonException e) {
			rejectBadMessage(session);
			return;
		}
		dispatch(session, node);
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
		if (!isAccepted(session)) {
			return;
		}
		String userId = attribute(session, DuelSocketConsts.USER_ID_ATTRIBUTE);
		notifier.unregister(userId, session);
		if (!notifier.isConnected(userId)) {
			matchmaking.cancel(userId);
			presence.onDisconnected(userId);
		}
	}

	private void dispatch(WebSocketSession session, JsonNode node) throws IOException {
		String userId = attribute(session, DuelSocketConsts.USER_ID_ATTRIBUTE);
		switch (node.path("type").asString("")) {
			case DuelSocketConsts.QUEUE_MESSAGE -> queue(session, userId, node);
			case DuelSocketConsts.CANCEL_MESSAGE -> matchmaking.cancel(userId);
			case DuelSocketConsts.PING_MESSAGE -> notifier.send(session, DuelSocketMessages.pong());
			default -> rejectBadMessage(session);
		}
	}

	private void queue(WebSocketSession session, String userId, JsonNode node) throws IOException {
		if (!accountSessions.holdsLock(userId, attribute(session, DuelSocketConsts.DEVICE_ID_ATTRIBUTE))) {
			rejectUnlocked(session);
			return;
		}
		matchmaking.join(userId, categories(node));
	}

	private static List<String> categories(JsonNode node) {
		List<String> categories = new ArrayList<>();
		node.path("categories").forEach(category -> categories.add(category.asString()));
		return categories;
	}

	private void rejectBadMessage(WebSocketSession session) {
		notifier.send(session, DuelSocketMessages.error(DuelSocketConsts.BAD_MESSAGE_ERROR));
	}

	private void rejectUnlocked(WebSocketSession session) throws IOException {
		notifier.send(session, DuelSocketMessages.error(DuelSocketConsts.NOT_LOCKED_ERROR));
		session.close(CloseStatus.POLICY_VIOLATION);
	}

	// Messages can still arrive, and the close always does, on a socket that was rejected.
	private static boolean isAccepted(WebSocketSession session) {
		return session.getAttributes().containsKey(DuelSocketConsts.USER_ID_ATTRIBUTE);
	}

	private static String attribute(WebSocketSession session, String name) {
		return (String) session.getAttributes().get(name);
	}

}
