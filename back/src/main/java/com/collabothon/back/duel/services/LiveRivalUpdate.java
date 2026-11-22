package com.collabothon.back.duel.services;

import java.util.List;

/** Published inside the answer transaction, sent after commit; {@code score} is final once {@code complete}. */
public record LiveRivalUpdate(
		String toUserId,
		long toMatchId,
		List<Boolean> results,
		boolean complete,
		int score
) {}
