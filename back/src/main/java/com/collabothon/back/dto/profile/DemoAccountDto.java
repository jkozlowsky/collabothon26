package com.collabothon.back.dto.profile;

public record DemoAccountDto(
		String userId,
		String firstName,
		String lastName,
		String avatar,
		DemoAccountStatus status) {}
