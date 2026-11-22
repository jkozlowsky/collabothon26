package com.collabothon.back.dto.duel;

/** One ranking row; {@code level} is the level of the all-time XP. */
public record RankingRowDto(
		int rank,
		String userId,
		String name,
		String avatar,
		int level,
		int weeklyXp,
		Integer previousRank,
		Long lastXpEventId
) {}
