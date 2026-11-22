package com.collabothon.back.categorization;

import java.util.random.RandomGenerator;

// Draws the open question at index (wrapping), so a test decides which of a lesson's questions comes.
public final class FixedRandom implements RandomGenerator {

	public volatile int index;

	@Override
	public long nextLong() {
		return 0;
	}

	@Override
	public int nextInt(int bound) {
		return index % bound;
	}

}
