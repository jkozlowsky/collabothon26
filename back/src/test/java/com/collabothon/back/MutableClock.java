package com.collabothon.back;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import com.collabothon.back.common.consts.TimeConsts;

import lombok.AllArgsConstructor;

/** A clock the tests move by hand. */
@AllArgsConstructor
public class MutableClock extends Clock {

	private volatile Instant instant;

	public void set(Instant instant) {
		this.instant = instant;
	}

	public void advance(Duration duration) {
		instant = instant.plus(duration);
	}

	@Override
	public ZoneId getZone() {
		return TimeConsts.ZONE;
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
