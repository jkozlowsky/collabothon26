package com.collabothon.back.dto.duel;

import java.util.List;

/** {@code me} is null when the user earned no XP this week. */
public record RankingsDto(
		List<RankingRowDto> top,
		RankingRowDto me
) {}
