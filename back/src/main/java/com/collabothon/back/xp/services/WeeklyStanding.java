package com.collabothon.back.xp.services;

/** A user's place in this week's XP ranking (1-based). */
public record WeeklyStanding(int rank, int weeklyXp) {
}
