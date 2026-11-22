package com.collabothon.back.duel.services;

import java.time.Instant;

record RivalAnswer(
		boolean correct,
		Instant visibleAt
) {}
