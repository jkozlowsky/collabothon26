package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum GapDirection {

	HABIT_AHEAD, KNOWLEDGE_AHEAD;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
