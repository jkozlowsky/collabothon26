package com.collabothon.back.duel.services;

import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.entities.duel.DuelMatch;

/** Where a match gets what the player can see of the rival: the simulator (bot, solo) or the opponent's real answers. */
public interface RivalSnapshotProvider {

	boolean supports(DuelMatch match);

	/** What the player can see of the rival now; null in SOLO matches. */
	RivalSnapshotDto snapshot(DuelProgress progress);

}
