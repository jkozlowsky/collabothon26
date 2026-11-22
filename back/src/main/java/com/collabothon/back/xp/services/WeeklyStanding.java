package com.collabothon.back.xp.services;

// previousRank is null unless the latest award moved the user.
public record WeeklyStanding(
		int rank,
		int weeklyXp,
		Integer previousRank,
		Long lastXpEventId) {}
