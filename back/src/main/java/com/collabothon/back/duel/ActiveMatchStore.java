package com.collabothon.back.duel;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * In-memory store for all currently running duel matches.
 *
 * <p>Concurrency model (two-level locking):
 * <ol>
 *   <li>The match registry itself uses a {@link ConcurrentHashMap} for lock-free lookups
 *       and atomic insert/remove by {@code matchId}, so independent matches never contend.</li>
 *   <li>Each {@link ActiveMatch} owns a dedicated {@code ReentrantLock} that serializes
 *       answers, question timeouts, bot responses, disconnects and resumes for that match.
 *       Outbound STOMP frames are collected under the lock and sent only after unlocking.</li>
 * </ol>
 */
@Component
class ActiveMatchStore {

	private final ConcurrentHashMap<Long, ActiveMatch> matches = new ConcurrentHashMap<>();

	/** Registers a newly created match by its persisted match ID. */
	void put(ActiveMatch match) {
		matches.put(match.getMatchId(), match);
	}

	/** Looks up an active match by ID. */
	Optional<ActiveMatch> findById(long matchId) {
		return Optional.ofNullable(matches.get(matchId));
	}

	/** Removes a finished or abandoned match from memory. */
	void remove(long matchId) {
		matches.remove(matchId);
	}

	/** Returns the count of currently active matches (useful for diagnostics and tests). */
	int activeCount() {
		return matches.size();
	}

}
