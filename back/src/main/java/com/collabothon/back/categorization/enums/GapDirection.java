package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum GapDirection {

	// ALIGNED is a Jev label only: it means no gap, so it never reaches a GapDto.
	HABIT_AHEAD, KNOWLEDGE_AHEAD, ALIGNED;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
