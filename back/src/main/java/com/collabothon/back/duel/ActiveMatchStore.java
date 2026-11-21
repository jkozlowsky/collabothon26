package com.collabothon.back.duel;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * In-memory registry of the matches a player is playing or has just finished. A match stays after it ended so the
 * client can still poll its state; ended matches are dropped after {@link #KEEP_ENDED} (the result lives in the
 * database). Per-match consistency is the caller's job: it synchronises on the {@link ActiveMatch}.
 */
@Component
class ActiveMatchStore {

	private static final Duration KEEP_ENDED = Duration.ofMinutes(30);

	private final ConcurrentHashMap<Long, ActiveMatch> matches = new ConcurrentHashMap<>();

	void put(ActiveMatch match, long nowMs) {
		matches.values()
			.removeIf(old -> old.isEnded() && nowMs - old.getEndedAtMs() > KEEP_ENDED.toMillis());
		matches.put(match.getMatchId(), match);
	}

	Optional<ActiveMatch> findById(long matchId) {
		return Optional.ofNullable(matches.get(matchId));
	}

}
