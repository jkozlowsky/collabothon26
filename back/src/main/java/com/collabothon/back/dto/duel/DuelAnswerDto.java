package com.collabothon.back.dto.duel;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A submitted answer as shown in the review; only the field that fits the step type is set. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DuelAnswerDto(
		Integer option,
		Double value,
		Integer mistakes
) {
}
