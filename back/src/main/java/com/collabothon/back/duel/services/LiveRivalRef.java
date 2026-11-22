package com.collabothon.back.duel.services;

/** The opponent of a live duel and their own match id. */
public record LiveRivalRef(String userId, long matchId) {
}
