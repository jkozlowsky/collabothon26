package com.collabothon.back.dto.xp;

public record CategoryXpDto(
		String category,
		int xp,
		int level,
		int xpIntoLevel,
		int xpForLevel,
		int weeklyXp) {}
