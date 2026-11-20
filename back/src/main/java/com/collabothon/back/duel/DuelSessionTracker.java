package com.collabothon.back.duel;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * The connected STOMP sessions and the match each one plays. Plain concurrent maps are enough: inbound frames,
 * disconnect events and queue ticks only read single entries.
 */
@Component
class DuelSessionTracker {

	private final ConcurrentHashMap<String, String> userBySession = new ConcurrentHashMap<>();

	private final ConcurrentHashMap<String, Long> matchBySession = new ConcurrentHashMap<>();

	void register(String sessionId, String userId) {
		userBySession.put(sessionId, userId);
	}

	/** A SEND can arrive before the connect event has been handled. */
	void ensureRegistered(String sessionId, String userId) {
		userBySession.putIfAbsent(sessionId, userId);
	}

	/** Forgets a disconnected session and returns what it was doing, if it was connected. */
	Optional<SessionInfo> unregister(String sessionId) {
		String userId = userBySession.remove(sessionId);
		Long matchId = matchBySession.remove(sessionId);
		return Optional.ofNullable(userId).map(user -> new SessionInfo(user, matchId));
	}

	boolean isOpen(String sessionId) {
		return sessionId != null && userBySession.containsKey(sessionId);
	}

	/** Lets a disconnect find the match the session belongs to. */
	void setActiveMatch(String sessionId, long matchId) {
		if (userBySession.containsKey(sessionId)) {
			matchBySession.put(sessionId, matchId);
		}
	}

	record SessionInfo(String userId, Long activeMatchId) {
	}

}
