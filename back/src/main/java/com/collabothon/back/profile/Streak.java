package com.collabothon.back.profile;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.TreeSet;
import java.util.stream.IntStream;

/**
 * Streak figures from the days the user finished at least one lesson.
 *
 * @param current days in a row up to today, or up to yesterday if today has no lesson yet ("at risk")
 * @param longest the longest run ever
 * @param doneToday whether today already counts
 * @param week Monday to Sunday of today's week, true where a lesson was done
 */
record Streak(int current, int longest, boolean doneToday, List<Boolean> week) {

	static Streak of(Collection<LocalDate> lessonDays, LocalDate today) {
		TreeSet<LocalDate> days = new TreeSet<>(lessonDays);
		boolean doneToday = days.contains(today);

		int current = 0;
		for (LocalDate d = doneToday ? today : today.minusDays(1); days.contains(d); d = d.minusDays(1)) {
			current++;
		}

		int longest = 0;
		int run = 0;
		LocalDate prev = null;
		for (LocalDate day : days) {
			run = prev != null && day.equals(prev.plusDays(1)) ? run + 1 : 1;
			longest = Math.max(longest, run);
			prev = day;
		}

		LocalDate monday = today.with(DayOfWeek.MONDAY);
		List<Boolean> week = IntStream.range(0, 7).mapToObj(i -> days.contains(monday.plusDays(i))).toList();
		return new Streak(current, longest, doneToday, week);
	}

}
