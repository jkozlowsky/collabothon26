package com.collabothon.back.dto.duel;

public record CategoryMatchEndDto(
		String story,
		int xpGained,
		int xpBefore,
		int xpAfter,
		int levelBefore,
		int levelAfter,
		int xpIntoLevelAfter,
		int xpForLevelAfter
) {}
