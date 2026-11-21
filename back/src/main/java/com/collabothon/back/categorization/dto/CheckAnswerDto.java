package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.collabothon.back.categorization.consts.CategorizationConsts;

/** {@code text} is null for "Not sure"; it is never stored or logged. */
public record CheckAnswerDto(
		@NotBlank
		@Size(max = CategorizationConsts.MAX_QUESTION_ID_LENGTH)
		String questionId,
		String text
) {

	@AssertTrue
	boolean isTextOneToMaxLong() {
		return text == null || (!text.isBlank() && text.strip().length() <= CategorizationConsts.MAX_ANSWER_LENGTH);
	}

	// Validation errors and logs print the rejected object.
	@Override
	public String toString() {
		return "CheckAnswerDto[questionId=" + questionId + ", text=" + (text == null ? "null" : "redacted") + "]";
	}

}
