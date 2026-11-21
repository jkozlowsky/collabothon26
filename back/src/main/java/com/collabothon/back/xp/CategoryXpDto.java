package com.collabothon.back.xp;

public record CategoryXpDto(
		String category,
		int xp,
		int level,
		int xpIntoLevel,
		int xpForLevel,
		int weeklyXp
) {
}
