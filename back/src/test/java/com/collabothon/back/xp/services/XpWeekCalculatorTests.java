package com.collabothon.back.xp.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

class XpWeekCalculatorTests {

	@Test
	void weekRunsFromMondayToMondayInWarsaw() {
		// Monday 2026-11-23 10:00 in Warsaw (UTC+1)
		Clock clock = Clock.fixed(Instant.parse("2026-11-23T09:00:00Z"), ZoneId.of("Europe/Warsaw"));

		WeekWindow week = new XpWeekCalculator(clock).currentWeek();

		assertThat(week.start()).isEqualTo(Instant.parse("2026-11-22T23:00:00Z"));
		assertThat(week.end()).isEqualTo(Instant.parse("2026-11-29T23:00:00Z"));
	}

	@Test
	void sundayNightInWarsawStillBelongsToTheSameWeek() {
		// Sunday 2026-11-29 23:59 in Warsaw
		Clock clock = Clock.fixed(Instant.parse("2026-11-29T22:59:00Z"), ZoneId.of("UTC"));

		WeekWindow week = new XpWeekCalculator(clock).currentWeek();

		assertThat(week.start()).isEqualTo(Instant.parse("2026-11-22T23:00:00Z"));
	}

}
