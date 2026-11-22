package com.collabothon.back.dto.profile;

public record SessionResponse(
		String userId,
		long ttlMs,
		long heartbeatMs) {}
