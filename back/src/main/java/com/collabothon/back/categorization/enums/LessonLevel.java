package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum LessonLevel {

	BEGINNER, ADVANCED;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
