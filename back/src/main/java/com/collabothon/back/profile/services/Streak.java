package com.collabothon.back.profile.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.TreeSet;

public record Streak(int current, int longest, boolean doneToday, List<Boolean> week) {

	public static Streak of(Collection<LocalDate> lessonDays, LocalDate today) {
		TreeSet<LocalDate> days = new TreeSet<>(lessonDays);
		boolean doneToday = days.contains(today);

		LocalDate startDay;
		if (doneToday) {
			startDay = today;
		}
		else {
			startDay = today.minusDays(1);
		}

		int current = 0;
		for (LocalDate d = startDay; days.contains(d); d = d.minusDays(1)) {
			current++;
		}

		int longest = 0;
		int run = 0;
		LocalDate prev = null;
		for (LocalDate day : days) {
			if (prev != null && day.equals(prev.plusDays(1))) {
				run++;
			}
			else {
				run = 1;
			}
			longest = Math.max(longest, run);
			prev = day;
		}

		LocalDate monday = today.with(DayOfWeek.MONDAY);
		List<Boolean> week = new ArrayList<>(7);
		for (int i = 0; i < 7; i++) {
			week.add(days.contains(monday.plusDays(i)));
		}
		return new Streak(current, longest, doneToday, week);
	}
}
