package com.collabothon.back.duel.models;

public record RankedPlayer(
		String userId,
		PlayerIdentity identity,
		int level
) {}
