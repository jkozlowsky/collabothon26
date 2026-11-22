package com.collabothon.back.dto.duel;

import java.util.List;

import com.collabothon.back.entities.duel.DuelMode;

public record MatchStateDto(
		long matchId,
		DuelMode mode,
		List<String> categories,
		PlayerCardDto you,
		PlayerCardDto rival,
		int questionCount,
		List<Boolean> yourResults,
		DuelQuestionDto question,
		RivalSnapshotDto rivalProgress,
		YourFinalDto yourFinal,
		boolean finished,
		boolean live
) {}
