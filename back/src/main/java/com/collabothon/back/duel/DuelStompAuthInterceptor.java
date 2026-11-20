package com.collabothon.back.duel;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.collabothon.back.common.BadRequestException;

/**
 * Turns the {@code userId} CONNECT header (1-64 characters) into the session {@link DuelPrincipal}, so that
 * {@code @SendToUser} and {@code convertAndSendToUser} reach that player. Prototype: no real authentication.
 */
@Component
class DuelStompAuthInterceptor implements ChannelInterceptor {

	private static final int MAX_USER_ID_LENGTH = 64;

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
		if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
			String userId = accessor.getFirstNativeHeader("userId");
			if (userId == null || userId.isBlank() || userId.trim().length() > MAX_USER_ID_LENGTH) {
				throw new BadRequestException("STOMP CONNECT header 'userId' is required (1-64 characters)");
			}
			DuelLang lang = DuelLang.from(accessor.getFirstNativeHeader("lang"));
			accessor.setUser(new DuelPrincipal(userId.trim(), lang));
		}
		return message;
	}

}
