package com.collabothon.back.dto.xp;

/** One category row of {@code GET /api/xp/{userId}/categories}. */
public record CategoryXpDto(
		String category,
		int xp,
		int level,
		int xpIntoLevel,
		int xpForLevel,
		int weeklyXp
) {
}
