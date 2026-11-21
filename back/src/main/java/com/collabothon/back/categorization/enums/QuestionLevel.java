package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum QuestionLevel {

	EASY, HARD;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
