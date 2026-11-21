package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.enums.Confidence;

/** {@code optionIndex} and {@code confidence} both null = "Not sure". */
public record HistoryEntryDto(
		@NotBlank
		@Size(max = CategorizationConsts.MAX_QUESTION_ID_LENGTH)
		String questionId,
		@PositiveOrZero
		Integer optionIndex,
		Confidence confidence
) {

	@AssertTrue(message = "an option needs a confidence, and Not sure has none")
	boolean isConfidenceWithOption() {
		return (optionIndex == null) == (confidence == null);
	}

}
