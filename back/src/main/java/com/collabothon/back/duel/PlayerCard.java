package com.collabothon.back.duel;

/** Who a player is on the match screen: name, category level, Elo (null for bots) and Explorer Avatar rank. */
record PlayerCard(String name, int level, Integer elo, int avatar, boolean bot) {
}
