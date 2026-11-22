package com.collabothon.back.categorization.controllers;

import java.util.random.RandomGenerator;

/** Draws the open question at {@code index} (wrapping), so a test decides which of a lesson's questions comes. */
final class FixedRandom implements RandomGenerator {

	volatile int index;

	@Override
	public long nextLong() {
		return 0;
	}

	@Override
	public int nextInt(int bound) {
		return index % bound;
	}

}
