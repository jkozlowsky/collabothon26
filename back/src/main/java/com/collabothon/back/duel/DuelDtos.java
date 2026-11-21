package com.collabothon.back.duel;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.node.ObjectNode;

public final class DuelDtos {

	private DuelDtos() {
	}

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

	public record PlayerCardDto(
			String name,
			String avatar,
			Map<String, Integer> levels
	) {
	}

	public record DuelQuestionDto(
			int index,
			String category,
			ObjectNode step,
			long deadline,
			long timeLimitMs
	) {
	}

	public record StartMatchRequest(
			@NotBlank String userId,
			@NotEmpty List<String> categories,
			@NotNull DuelMode mode
	) {
	}

	public record RivalSnapshotDto(
			int answered,
			List<Boolean> results
	) {
	}

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

	public record AnswerRequest(
			@NotBlank String userId,
			int index,
			Integer option,
			Double value,
			Integer mistakes
	) {
	}

	public record YourFinalDto(
			int score,
			int xpGained
	) {
	}

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
			boolean finished
	) {
	}

	public record ReviewItemDto(
			int index,
			String category,
			ObjectNode step,
			@JsonInclude(JsonInclude.Include.ALWAYS) DuelAnswerDto yourAnswer,
			boolean correct,
			String lessonId,
			String lessonTitle
	) {
	}

	public record MatchEndDto(
			long matchId,
			DuelMode mode,
			List<String> categories,
			MatchOutcome outcome,
			int score,
			Integer rivalScore,
			PlayerCardDto you,
			PlayerCardDto rival,
			int xpGained,
			Map<String, Integer> xpByCategory,
			List<ReviewItemDto> review
	) {
	}

	public record MatchSummaryDto(
			long matchId,
			DuelMode mode,
			List<String> categories,
			PlayerCardDto rival,
			String status,
			boolean seen,
			int score,
			Integer rivalScore,
			MatchOutcome outcome,
			int xpGained,
			String startedAt
	) {
	}

}
