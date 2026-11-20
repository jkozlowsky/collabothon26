package com.collabothon.back.duel;

import java.util.concurrent.ScheduledFuture;

import com.collabothon.back.duel.MatchService.MatchedPlayer;

/** A waiting player; every field except the identity is guarded by the queue lock of {@link MatchmakingService}. */
final class QueueEntry {


	final String sessionId;

	final String userId;

	final DuelLang lang;

	final DuelCategory category;

	final int elo;

	int elapsedSec;

	boolean widened;

	boolean botOfferSent;

	boolean cancelled;

	boolean matched;

	ScheduledFuture<?> tickFuture;

	QueueEntry(String sessionId, String userId, DuelLang lang, DuelCategory category, int elo) {
		this.sessionId = sessionId;
		this.userId = userId;
		this.lang = lang;
		this.category = category;
		this.elo = elo;
	}

	MatchedPlayer toMatchedPlayer() {
		return new MatchedPlayer(sessionId, userId, lang);
	}

	void markMatched() {
		this.matched = true;
		cancelTicks();
	}

	void cancel() {
		this.cancelled = true;
		cancelTicks();
	}

	private void cancelTicks() {
		if (tickFuture != null) {
			tickFuture.cancel(false);
			tickFuture = null;
		}
	}

}
