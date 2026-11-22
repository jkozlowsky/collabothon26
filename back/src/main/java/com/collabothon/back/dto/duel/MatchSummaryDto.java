package com.collabothon.back.dto.duel;

import java.util.List;

import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.entities.duel.MatchOutcome;

public record MatchSummaryDto(
		long matchId,
		DuelMode mode,
		List<String> categories,
		PlayerCardDto rival,
		MatchSummaryStatus status,
		boolean seen,
		int score,
		Integer rivalScore,
		MatchOutcome outcome,
		int xpGained,
		String startedAt
) {}
