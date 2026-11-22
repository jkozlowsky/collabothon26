package com.collabothon.back.xp.services;

/** A user's place in this week's XP ranking (1-based), with previous rank and latest XP event id. */
public record WeeklyStanding(
		int rank,
		int weeklyXp,
		Integer previousRank,
		Long lastXpEventId
) {

	public WeeklyStanding(int rank, int weeklyXp) {
		this(rank, weeklyXp, null, null);
	}

}
