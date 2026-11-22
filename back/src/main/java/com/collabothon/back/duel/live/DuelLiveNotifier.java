package com.collabothon.back.duel.live;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import com.collabothon.back.duel.services.LiveRivalUpdate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.json.JsonMapper;

/** Which sockets belong to which account, and the push to them. In memory: one backend instance. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DuelLiveNotifier {

	private static final int SEND_TIME_LIMIT_MS = 5_000;

	private static final int BUFFER_SIZE_LIMIT = 64 * 1024;

	private final JsonMapper json;

	private final Map<String, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

	/** Registers the socket; the returned session is the thread-safe one to send through. */
	public WebSocketSession register(String userId, WebSocketSession session) {
		WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT);
		sessions.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet()).add(safe);
		return safe;
	}

	public void unregister(String userId, WebSocketSession session) {
		sessions.computeIfPresent(userId, (id, open) -> {
			open.removeIf(candidate -> sameSocket(candidate, session));
			return open.isEmpty() ? null : open;
		});
	}

	public boolean isConnected(String userId) {
		return sessions.containsKey(userId);
	}

	public void send(String userId, Map<String, Object> message) {
		Set<WebSocketSession> open = sessions.get(userId);
		if (open == null) {
			return;
		}
		TextMessage text = new TextMessage(json.writeValueAsString(message));
		for (WebSocketSession session : open) {
			send(session, text);
		}
	}

	public void send(WebSocketSession session, Map<String, Object> message) {
		send(session, new TextMessage(json.writeValueAsString(message)));
	}

	/** After the answer commits, tells the opponent how far the player has got. */
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	void onRivalUpdate(LiveRivalUpdate update) {
		List<Boolean> results = update.results();
		send(update.toUserId(), DuelSocketMessages.rivalProgress(update.toMatchId(), results));
		if (update.finalScore() != null) {
			send(update.toUserId(), DuelSocketMessages.rivalFinished(update.toMatchId(), update.finalScore()));
		}
	}

	private void send(WebSocketSession session, TextMessage text) {
		try {
			if (session.isOpen()) {
				session.sendMessage(text);
			}
		}
		catch (IOException | RuntimeException e) {
			log.debug("Dropping a push to a closed duel socket: {}", e.getMessage());
		}
	}

	private static boolean sameSocket(WebSocketSession decorated, WebSocketSession raw) {
		return decorated == raw || decorated.getId().equals(raw.getId());
	}

}
