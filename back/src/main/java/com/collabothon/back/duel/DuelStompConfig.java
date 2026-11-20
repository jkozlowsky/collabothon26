package com.collabothon.back.duel;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/** STOMP over a native WebSocket at {@code /ws/duel}: commands go to {@code /app/duel/*}, events to {@code /user/queue/duel}. */
@Configuration
@EnableWebSocketMessageBroker
class DuelStompConfig implements WebSocketMessageBrokerConfigurer {

	private final DuelStompAuthInterceptor authInterceptor;

	private final String[] allowedOrigins;

	DuelStompConfig(DuelStompAuthInterceptor authInterceptor,
			@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
		this.authInterceptor = authInterceptor;
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		registry.enableSimpleBroker("/queue");
		registry.setApplicationDestinationPrefixes("/app");
		registry.setUserDestinationPrefix("/user");
		// Frames of one session must arrive in publish order (match.start, question, ..., match.end).
		registry.setPreservePublishOrder(true);
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.addEndpoint("/ws/duel").setAllowedOrigins(allowedOrigins);
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(authInterceptor);
	}

}
