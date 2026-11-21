package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum CategorizationSource {

	JEV, FALLBACK;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
