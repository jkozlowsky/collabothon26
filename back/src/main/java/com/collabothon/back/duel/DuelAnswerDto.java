package com.collabothon.back.duel;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DuelAnswerDto(
		Integer option,
		Double value,
		Integer mistakes
) {

	public static DuelAnswerDto ofOption(int option) {
		return new DuelAnswerDto(option, null, null);
	}

	public static DuelAnswerDto ofValue(double value) {
		return new DuelAnswerDto(null, value, null);
	}

	public static DuelAnswerDto ofMistakes(int mistakes) {
		return new DuelAnswerDto(null, null, mistakes);
	}

}
