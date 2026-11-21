package com.collabothon.back.duel.services;

import com.collabothon.back.config.DuelProperties;

/** Default duel tunables, as bound from an empty {@code app.duel} block. */
final class DuelTestFixtures {

	static final DuelProperties PROPERTIES = new DuelProperties(6, 10_000L, 60_000L, 4.0, 12_000L, 20_000L,
			25_000L, 20_000L, 25_000L, 1000L, 4000L, true);

	private DuelTestFixtures() {
	}

}
