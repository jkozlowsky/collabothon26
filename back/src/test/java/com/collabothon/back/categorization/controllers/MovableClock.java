package com.collabothon.back.categorization.controllers;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;

final class MovableClock extends Clock {

	private final Instant start;

	private final AtomicReference<Instant> now;

	MovableClock(Instant start) {
		this.start = start;
		this.now = new AtomicReference<>(start);
	}

	void advance(Duration by) {
		now.updateAndGet(t -> t.plus(by));
	}

	void reset() {
		now.set(start);
	}

	@Override
	public ZoneId getZone() {
		return ZoneId.of("Europe/Berlin");
	}

	@Override
	public Clock withZone(ZoneId zone) {
		throw new UnsupportedOperationException();
	}

	@Override
	public Instant instant() {
		return now.get();
	}

}
