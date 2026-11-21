package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.collabothon.back.categorization.consts.CategorizationConsts;

/** {@code optionIndex} null = "Not sure". */
public record HistoryEntryDto(
		@NotBlank
		@Size(max = CategorizationConsts.MAX_QUESTION_ID_LENGTH)
		String questionId,
		@PositiveOrZero
		Integer optionIndex
) {}
