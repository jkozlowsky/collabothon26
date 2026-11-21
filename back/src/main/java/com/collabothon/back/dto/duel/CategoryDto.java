package com.collabothon.back.dto.duel;

/** One lobby tile of {@code GET /api/duel/categories}: a story and the user's level in it. */
public record CategoryDto(
		String story,
		String name,
		String icon,
		String color,
		int xp,
		int level,
		int xpIntoLevel,
		int xpForLevel
) {
}
