package com.collabothon.back.dto.duel;

import java.util.Map;

/** A player as shown in a duel; {@code levels} are by area slug. */
public record PlayerCardDto(
		String name,
		String avatar,
		Map<String, Integer> levels
) {}
