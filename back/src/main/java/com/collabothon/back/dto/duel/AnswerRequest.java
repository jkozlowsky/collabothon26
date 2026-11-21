package com.collabothon.back.dto.duel;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** One answer: {@code option} for quiz, {@code value} for predict/chart, {@code mistakes} for sort/match. */
public record AnswerRequest(
		@NotBlank @Size(max = 64) String userId,
		@PositiveOrZero int index,
		Integer option,
		Double value,
		Integer mistakes
) {
}
