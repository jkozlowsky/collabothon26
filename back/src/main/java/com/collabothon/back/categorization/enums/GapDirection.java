package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum GapDirection {

	UNDER, OVER;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
