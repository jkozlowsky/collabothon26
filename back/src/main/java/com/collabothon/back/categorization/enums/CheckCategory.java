package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum CheckCategory {

	FINANCE, INVESTING;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
