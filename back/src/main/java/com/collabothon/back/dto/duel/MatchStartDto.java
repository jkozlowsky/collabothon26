package com.collabothon.back.dto.duel;

import java.util.List;

import com.collabothon.back.entities.duel.DuelMode;

public record MatchStartDto(
		long matchId,
		DuelMode mode,
		List<String> categories,
		PlayerCardDto you,
		PlayerCardDto rival,
		int questionCount,
		DuelQuestionDto question
) {
}
