package com.collabothon.back.dto.profile;

import com.fasterxml.jackson.annotation.JsonValue;

public enum DemoAccountStatus {
	FREE("free"),
	MINE("mine"),
	IN_USE("in-use");

	private final String value;

	DemoAccountStatus(String value) {
		this.value = value;
	}

	@JsonValue
	public String getValue() {
		return value;
	}
}
