package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {

	NOVICE, INTERMEDIATE, ADVANCED;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
