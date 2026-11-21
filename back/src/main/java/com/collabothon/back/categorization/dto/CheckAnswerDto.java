package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

import com.collabothon.back.categorization.consts.CategorizationConsts;

/** {@code text} is null for "Not sure"; it is never stored or logged. */
public record CheckAnswerDto(
		@NotBlank
		String questionId,
		String text
) {

	@AssertTrue
	boolean isTextOneToMaxLong() {
		return text == null || (!text.isBlank() && text.strip().length() <= CategorizationConsts.MAX_ANSWER_LENGTH);
	}

}
