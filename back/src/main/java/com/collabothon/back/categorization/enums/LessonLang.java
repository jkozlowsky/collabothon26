package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum LessonLang {

	PLAIN, STANDARD;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
