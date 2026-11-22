package com.collabothon.back.duel.live;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

/** A movable clock for the live duel tests. */
class TestClock extends Clock {

	private volatile Instant instant;

	TestClock(Instant initial) {
		this.instant = initial;
	}

	void advance(Duration duration) {
		instant = instant.plus(duration);
	}

	@Override
	public ZoneId getZone() {
		return ZoneId.of("Europe/Warsaw");
	}

	@Override
	public Clock withZone(ZoneId zone) {
		return this;
	}

	@Override
	public Instant instant() {
		return instant;
	}

}
