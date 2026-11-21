package com.collabothon.back.xp.services;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/** The ISO week (Monday 00:00 to Monday 00:00, Europe/Warsaw) that weekly XP and rankings count. */
@Component
@RequiredArgsConstructor
public class XpWeekCalculator {

	public static final ZoneId WARSAW_ZONE = ZoneId.of("Europe/Warsaw");

	private final Clock clock;

	public WeekWindow currentWeek() {
		ZonedDateTime weekStart = clock.instant()
			.atZone(WARSAW_ZONE)
			.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.truncatedTo(ChronoUnit.DAYS);
		return new WeekWindow(weekStart.toInstant(), weekStart.plusWeeks(1).toInstant());
	}

}
