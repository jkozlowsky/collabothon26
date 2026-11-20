package com.collabothon.back.duel;

import java.security.Principal;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Keeps the session registry current and frees queue spot and match seat when a player's socket closes. */
@Component
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Slf4j
class DuelSessionEventListener {

	private final DuelSessionTracker sessionTracker;

	private final MatchmakingService matchmaking;

	private final MatchService matches;

	@EventListener
	void onConnect(SessionConnectEvent event) {
		StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
		Principal principal = accessor.getUser();
		if (accessor.getSessionId() != null && principal instanceof DuelPrincipal user) {
			sessionTracker.register(accessor.getSessionId(), user.userId());
			log.debug("Duel session connected");
		}
	}

	@EventListener
	void onDisconnect(SessionDisconnectEvent event) {
		String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
		if (sessionId == null) {
			return;
		}
		sessionTracker.unregister(sessionId).ifPresent(info -> {
			if (info.activeMatchId() != null) {
				matches.handleDisconnect(info.userId(), sessionId, info.activeMatchId());
			}
		});
		matchmaking.leaveQueue(sessionId);
		log.debug("Duel session disconnected");
	}

}
