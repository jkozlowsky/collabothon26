package com.collabothon.back.duel.live;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import com.collabothon.back.duel.consts.DuelSocketConsts;
import com.collabothon.back.duel.services.LiveRivalUpdate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.json.JsonMapper;

/** Which sockets belong to which account, and the push to them. In memory: one backend instance. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DuelLiveNotifier {

	private final JsonMapper json;

	private final Map<String, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

	void register(String userId, WebSocketSession session) {
		// A session takes one send at a time; the decorator queues concurrent pushes.
		WebSocketSession decorated = new ConcurrentWebSocketSessionDecorator(session,
				DuelSocketConsts.SEND_TIME_LIMIT_MS, DuelSocketConsts.BUFFER_SIZE_LIMIT);
		sessions.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet()).add(decorated);
	}

	void unregister(String userId, WebSocketSession session) {
		sessions.computeIfPresent(userId, (id, open) -> {
			open.removeIf(decorated -> decorated.getId().equals(session.getId()));
			if (open.isEmpty()) {
				return null;
			}
			return open;
		});
	}

	boolean isConnected(String userId) {
		return sessions.containsKey(userId);
	}

	void send(String userId, Map<String, Object> message) {
		Set<WebSocketSession> open = sessions.get(userId);
		if (open == null) {
			return;
		}
		TextMessage text = new TextMessage(json.writeValueAsString(message));
		for (WebSocketSession session : open) {
			send(session, text);
		}
	}

	void send(WebSocketSession session, Map<String, Object> message) {
		send(session, new TextMessage(json.writeValueAsString(message)));
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	void onRivalUpdate(LiveRivalUpdate update) {
		send(update.toUserId(), DuelSocketMessages.rivalProgress(update.toMatchId(), update.results()));
		if (update.complete()) {
			send(update.toUserId(), DuelSocketMessages.rivalFinished(update.toMatchId(), update.score()));
		}
	}

	private void send(WebSocketSession session, TextMessage text) {
		try {
			if (session.isOpen()) {
				session.sendMessage(text);
			}
		}
		catch (IOException | RuntimeException e) {
			// Pushes are best effort: the client polls the match state as well.
			log.debug("Dropping a push to a closed duel socket: {}", e.getMessage());
		}
	}

}
