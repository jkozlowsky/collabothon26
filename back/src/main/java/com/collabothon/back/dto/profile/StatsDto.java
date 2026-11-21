package com.collabothon.back.dto.profile;

import java.util.List;

public record StatsDto(int currentStreak, int longestStreak, boolean doneToday, List<Boolean> week, int totalXp,
		long lessonsCompleted) {
}
