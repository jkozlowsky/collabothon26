package com.collabothon.back.duel.live;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/** Registers the duel socket at {@code /ws/duel}, for the same browser origins as the REST API. */
@Configuration
@EnableWebSocket
class DuelWebSocketConfig implements WebSocketConfigurer {

	static final String PATH = "/ws/duel";

	private final DuelSocketHandler handler;

	private final String[] allowedOrigins;

	DuelWebSocketConfig(DuelSocketHandler handler, @Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
		this.handler = handler;
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(handler, PATH).setAllowedOrigins(allowedOrigins);
	}

}
