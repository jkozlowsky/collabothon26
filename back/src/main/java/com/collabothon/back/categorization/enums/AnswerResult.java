package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum AnswerResult {

	CORRECT, WRONG, NOT_SURE;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
