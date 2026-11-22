package com.collabothon.back.duel.demo;

import java.time.Duration;

record DemoXpRow(
		String category,
		String part,
		int xp,
		Duration sinceWeekStart
) {}
