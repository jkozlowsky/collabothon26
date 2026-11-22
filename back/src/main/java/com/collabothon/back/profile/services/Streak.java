package com.collabothon.back.profile.services;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;

public record Streak(
		int current,
		int longest,
		boolean doneToday,
		List<Boolean> week) {

	public static Streak of(Collection<LocalDate> lessonDays, LocalDate today) {
		SortedSet<LocalDate> days = new TreeSet<>(lessonDays);
		return new Streak(currentRun(days, today), longestRun(days), days.contains(today), weekOf(days, today));
	}

	private static int currentRun(Set<LocalDate> days, LocalDate today) {
		LocalDate day = today;
		// A streak ending yesterday still counts until today is over.
		if (!days.contains(today)) {
			day = today.minusDays(1);
		}
		int run = 0;
		while (days.contains(day)) {
			run++;
			day = day.minusDays(1);
		}
		return run;
	}

	private static int longestRun(SortedSet<LocalDate> days) {
		int longest = 0;
		int run = 0;
		for (LocalDate day : days) {
			if (days.contains(day.minusDays(1))) {
				run++;
			}
			else {
				run = 1;
			}
			longest = Math.max(longest, run);
		}
		return longest;
	}

	private static List<Boolean> weekOf(Set<LocalDate> days, LocalDate today) {
		return Arrays.stream(DayOfWeek.values()).map(day -> days.contains(today.with(day))).toList();
	}

}
