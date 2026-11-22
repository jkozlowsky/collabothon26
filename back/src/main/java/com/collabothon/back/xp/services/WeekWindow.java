package com.collabothon.back.xp.services;

import java.time.Instant;

public record WeekWindow(
		Instant start,
		Instant end) {

	public boolean contains(Instant at) {
		return !at.isBefore(start) && at.isBefore(end);
	}

}
