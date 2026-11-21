package com.collabothon.back.dto.duel;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * One answer: {@code option} for quiz, {@code value} for predict/chart, {@code buckets} for sort, {@code pairs} for
 * match.
 */
public record AnswerRequest(
		@NotBlank @Size(max = 64) String userId,
		@PositiveOrZero int index,
		Integer option,
		Double value,
		List<Integer> buckets,
		List<Integer> pairs
) {
}
