package com.collabothon.back.dto.duel;

/** One lobby tile; {@code story} holds the area slug. */
public record CategoryDto(
		String story,
		String name,
		String icon,
		String color,
		int xp,
		int level,
		int xpIntoLevel,
		int xpForLevel
) {}
