package com.collabothon.back.dto.duel;

public record AnswerResultDto(
		int index,
		boolean correct,
		boolean timedOut,
		DuelQuestionDto nextQuestion,
		RivalSnapshotDto rivalProgress,
		YourFinalDto yourFinal,
		boolean finished
) {
}
