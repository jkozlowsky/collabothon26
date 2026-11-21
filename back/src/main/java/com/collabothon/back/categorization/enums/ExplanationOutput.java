package com.collabothon.back.categorization.enums;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum ExplanationOutput {

	ROLE("role"), FOCUS_AREAS("focusAreas");

	private final String wire;

	// Not @Getter: that would be getWire(), unlike wire() on every other enum here.
	@JsonValue
	public String wire() {
		return wire;
	}

}
