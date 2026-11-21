package com.collabothon.back.duel;

/** Who a player is on the match screen: first name, category level, Elo (null for bots) and account avatar (null for bots). */
record PlayerCard(String name, int level, Integer elo, String avatar, boolean bot) {
}
