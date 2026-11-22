package com.collabothon.back.duel.services;

import java.util.List;

/**
 * Published inside the answer transaction and handled after commit: {@code results} are the answers the player has
 * given so far, {@code finalScore} is set once they have given all of them.
 */
public record LiveRivalUpdate(String toUserId, long toMatchId, List<Boolean> results, Integer finalScore) {
}
