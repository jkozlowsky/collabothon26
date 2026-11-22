package com.collabothon.back.dto.profile;

public record AccountDto(
		String userId,
		String firstName,
		String lastName,
		String avatar) {}
