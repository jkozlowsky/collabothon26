package com.collabothon.back.dto.duel;

/** One row of the weekly ranking; {@code level} is the level of the user's total XP. */
public record RankingRowDto(
		int rank,
		String userId,
		String name,
		String avatar,
		int level,
		int weeklyXp
) {
}
