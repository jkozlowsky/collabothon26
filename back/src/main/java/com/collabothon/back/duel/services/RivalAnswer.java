package com.collabothon.back.duel.services;

import java.time.Instant;

/** The simulated rival's answer to one question and when it becomes visible to the player. */
record RivalAnswer(boolean correct, Instant visibleAt) {
}
