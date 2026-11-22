package com.collabothon.back.dto.duel;

import java.util.List;

/** What the player can see of the rival: answers whose time has come, null for the rest. */
public record RivalSnapshotDto(
		int answered,
		List<Boolean> results
) {}
