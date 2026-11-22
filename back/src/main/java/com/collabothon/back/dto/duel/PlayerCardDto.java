package com.collabothon.back.dto.duel;

import java.util.Map;

/** A player as shown in a duel: full name, avatar and level per story id. */
public record PlayerCardDto(
		String name,
		String avatar,
		Map<String, Integer> levels
) {
}
