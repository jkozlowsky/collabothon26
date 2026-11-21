package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum CheckResult {

	UNDERSTANDS, PARTLY, NOT_YET;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
