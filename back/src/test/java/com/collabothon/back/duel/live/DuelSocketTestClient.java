package com.collabothon.back.duel.live;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@RequiredArgsConstructor
class DuelSocketTestClient extends TextWebSocketHandler {

	final BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();

	final BlockingQueue<CloseStatus> closed = new LinkedBlockingQueue<>();

	private final JsonMapper json;

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
