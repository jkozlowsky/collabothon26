package com.collabothon.back.dto.profile;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum DemoAccountStatus {

	FREE("free"),
	MINE("mine"),
	IN_USE("in-use");

	@JsonValue
	private final String value;

}
