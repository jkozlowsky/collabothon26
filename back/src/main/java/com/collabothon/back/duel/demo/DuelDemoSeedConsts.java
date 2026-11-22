package com.collabothon.back.duel.demo;

import java.time.Duration;
import java.util.List;

import com.collabothon.back.common.consts.DemoConsts;
import com.collabothon.back.lesson.consts.LessonConsts;

final class DuelDemoSeedConsts {

	static final String WEEKLY_PART = "w";

	static final String PAST_PART = "p";

	static final Duration THIS_WEEK_FIRST = Duration.ofHours(12);

	static final Duration THIS_WEEK_SECOND = Duration.ofHours(36);

	static final Duration PAST_FIRST = Duration.ofDays(-7);

	static final Duration PAST_SECOND = Duration.ofDays(-16);

	// Pinned for the demo: 125 XP this week is rank 6, and 66 in Risk is one won duel short of a level up.
	static final List<DemoXpRow> ALEX_ROWS = List.of(
			new DemoXpRow(LessonConsts.AREA_SAVING, "w1", 59, THIS_WEEK_FIRST),
			new DemoXpRow(DuelDemoConsts.RISK_CATEGORY, "w2", 66, THIS_WEEK_SECOND),
			new DemoXpRow(LessonConsts.AREA_BORROWING, "p1", 60, PAST_FIRST),
			new DemoXpRow(LessonConsts.AREA_INVESTING, "p2", 60, PAST_SECOND));

	// demo-kasia is 3 XP above Alex, so one won duel moves Alex up. The order is the insert order.
	static final List<DemoPlayer> PLAYERS = List.of(
			new DemoPlayer("demo-tomasz", 310, 300),
			new DemoPlayer(DuelDemoConsts.FALLBACK_RIVAL, 265, 250),
			new DemoPlayer("demo-marta", 220, 200),
			new DemoPlayer("demo-jonas", 180, 180),
			new DemoPlayer("demo-kasia", 128, 150),
			new DemoPlayer(DemoConsts.ALEX_USER_ID, 125, 120),
			new DemoPlayer("demo-piotr", 90, 90),
			new DemoPlayer("demo-sofia", 60, 60),
			new DemoPlayer("demo-marek", 40, 50),
			new DemoPlayer("demo-lukas", 30, 40),
			new DemoPlayer("demo-nina", 20, 30),
			new DemoPlayer("demo-ewa", 10, 20),
			new DemoPlayer("demo-liam", 118, 113),
			new DemoPlayer("demo-chloe", 114, 109),
			new DemoPlayer("demo-matteo", 110, 105),
			new DemoPlayer("demo-yuki", 106, 101),
			new DemoPlayer("demo-carlos", 102, 97),
			new DemoPlayer("demo-amelie", 88, 83),
			new DemoPlayer(DemoConsts.DANIEL_USER_ID, 85, 80),
			new DemoPlayer("demo-lars", 82, 77),
			new DemoPlayer("demo-fatima", 79, 74),
			new DemoPlayer("demo-kwame", 76, 71),
			new DemoPlayer("demo-sora", 73, 68),
			new DemoPlayer("demo-hugo", 70, 65),
			new DemoPlayer(DemoConsts.ELENA_USER_ID, 67, 70),
			new DemoPlayer("demo-astrid", 64, 59),
			new DemoPlayer("demo-tariq", 62, 57),
			new DemoPlayer("demo-freja", 58, 53),
			new DemoPlayer("demo-diego", 55, 50),
			new DemoPlayer("demo-ananya", 52, 47),
			new DemoPlayer("demo-lucas", 49, 59),
			new DemoPlayer("demo-camila", 46, 56),
			new DemoPlayer("demo-finn", 43, 53),
			new DemoPlayer("demo-ines", 38, 48),
			new DemoPlayer("demo-noah", 36, 46),
			new DemoPlayer("demo-zeynep", 34, 44),
			new DemoPlayer("demo-mateo", 32, 42),
			new DemoPlayer("demo-chiara", 28, 38),
			new DemoPlayer("demo-artur", 26, 36),
			new DemoPlayer("demo-leila", 24, 34),
			new DemoPlayer("demo-soren", 22, 32),
			new DemoPlayer("demo-elise", 18, 28),
			new DemoPlayer("demo-kenji", 16, 26),
			new DemoPlayer("demo-mariam", 14, 24),
			new DemoPlayer("demo-felix", 12, 22),
			new DemoPlayer("demo-nadia", 8, 18),
			new DemoPlayer("demo-gabriel", 7, 17),
			new DemoPlayer("demo-alina", 6, 16),
			new DemoPlayer("demo-omar", 5, 15),
			new DemoPlayer("demo-maya", 4, 14));

}
