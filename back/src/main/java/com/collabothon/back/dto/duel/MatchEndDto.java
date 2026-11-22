package com.collabothon.back.dto.duel;

import java.util.List;
import java.util.Map;

import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.entities.duel.MatchOutcome;

public record MatchEndDto(
		long matchId,
		DuelMode mode,
		List<CategoryMatchEndDto> categories,
		MatchOutcome outcome,
		int score,
		Integer rivalScore,
		PlayerCardDto you,
		PlayerCardDto rival,
		int xpGained,
		Map<String, Integer> xpByCategory,
		List<ReviewItemDto> review
) {}
