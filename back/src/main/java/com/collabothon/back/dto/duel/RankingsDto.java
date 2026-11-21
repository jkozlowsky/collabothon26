package com.collabothon.back.dto.duel;

import java.util.List;

/** The weekly top 50, plus the requesting user's own row (null if they earned no XP this week). */
public record RankingsDto(
		List<RankingRowDto> top,
		RankingRowDto me
) {
}
