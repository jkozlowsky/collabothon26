package com.collabothon.back.duel;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** Sends a frame to the {@code /user/queue/duel} subscription of one player. */
@Component
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class DuelMessagePublisher {

	static final String USER_QUEUE = "/queue/duel";

	private final SimpMessagingTemplate messagingTemplate;

	void sendToUser(String userId, DuelMessage payload) {
		messagingTemplate.convertAndSendToUser(userId, USER_QUEUE, payload);
	}

}
