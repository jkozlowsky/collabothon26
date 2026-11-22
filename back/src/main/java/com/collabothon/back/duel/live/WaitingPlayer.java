package com.collabothon.back.duel.live;

import java.time.Instant;
import java.util.List;

/** One wait in the queue: queuing again gets a new ticket, so an older timer cannot end the new wait. */
record WaitingPlayer(
		String userId,
		List<String> categories,
		Instant queuedAt,
		long ticket
) {}
