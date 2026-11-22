package com.collabothon.back.xp.services;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

import org.springframework.stereotype.Component;

import com.collabothon.back.common.consts.TimeConsts;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class XpWeekCalculator {

	private final Clock clock;

	public WeekWindow currentWeek() {
		ZonedDateTime weekStart = clock.instant()
			.atZone(TimeConsts.XP_WEEK_ZONE)
			.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.truncatedTo(ChronoUnit.DAYS);
		return new WeekWindow(weekStart.toInstant(), weekStart.plusWeeks(1).toInstant());
	}

}
