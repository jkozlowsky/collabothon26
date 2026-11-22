package com.collabothon.back.duel.live;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.collabothon.back.config.CorsProperties;
import com.collabothon.back.duel.consts.DuelSocketConsts;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
class DuelWebSocketConfig implements WebSocketConfigurer {

	private final DuelSocketHandler handler;

	private final CorsProperties cors;

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(handler, DuelSocketConsts.PATH).setAllowedOrigins(cors.allowedOrigins());
	}

}
