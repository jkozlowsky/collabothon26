package com.collabothon.back.duel.services;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.xp.services.WeekWindow;
import com.collabothon.back.xp.services.XpService;
import com.collabothon.back.xp.services.XpWeekCalculator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Dev-only demo data for the weekly ranking: XP for the demo-* accounts, dated relative to the current week, with
 * part of it this week. Alex ({@code demo-user}) lands rank 6 (125 XP), so winning a match moves them up.
 * Runs once per week: skips each player individually if they already have XP this week.
 */
@Component
@ConditionalOnProperty(name = "app.duel.seed-demo-xp", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DuelDemoSeeder implements ApplicationRunner {

	private static final List<String> CATEGORIES = List.of("berlin", "seoul", "sao-paulo", "tokyo");

	private static final List<DemoPlayer> PLAYERS = List.of(
			// Existing players (unchanged)
			new DemoPlayer("demo-tomasz", 310, 300),
			new DemoPlayer("demo-ola", 265, 250),
			new DemoPlayer("demo-marta", 220, 200),
			new DemoPlayer("demo-jonas", 180, 180),
			new DemoPlayer("demo-kasia", 150, 150),
			new DemoPlayer("demo-user", 125, 120),
			new DemoPlayer("demo-piotr", 90, 90),
			new DemoPlayer("demo-sofia", 60, 60),
			new DemoPlayer("demo-marek", 40, 50),
			new DemoPlayer("demo-lukas", 30, 40),
			new DemoPlayer("demo-nina", 20, 30),
			new DemoPlayer("demo-ewa", 10, 20),

			// 38 new players (Daniel, Elena, and 36 mock players; all weeklyXp < 125)
			new DemoPlayer("demo-liam", 118, 113),
			new DemoPlayer("demo-chloe", 114, 109),
			new DemoPlayer("demo-matteo", 110, 105),
			new DemoPlayer("demo-yuki", 106, 101),
			new DemoPlayer("demo-carlos", 102, 97),
			new DemoPlayer("demo-amelie", 88, 83),
			new DemoPlayer("demo-daniel", 85, 80),
			new DemoPlayer("demo-lars", 82, 77),
			new DemoPlayer("demo-fatima", 79, 74),
			new DemoPlayer("demo-kwame", 76, 71),
			new DemoPlayer("demo-sora", 73, 68),
			new DemoPlayer("demo-hugo", 70, 65),
			new DemoPlayer("demo-elena", 67, 70),
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
			new DemoPlayer("demo-maya", 4, 14)
	);

	private final XpService xpService;

	private final XpWeekCalculator weekCalculator;

	@Override
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void run(ApplicationArguments args) {
		WeekWindow week = weekCalculator.currentWeek();
		Instant weekStart = week.start();
		SeedDates dates = new SeedDates(weekStart.plus(Duration.ofHours(12)), weekStart.plus(Duration.ofHours(36)),
				weekStart.minus(Duration.ofDays(7)), weekStart.minus(Duration.ofDays(16)));

		int seededCount = 0;
		for (DemoPlayer player : PLAYERS) {
			if (!xpService.hasXpBetween(player.userId(), week.start(), week.end())) {
				seed(player, dates);
				seededCount++;
			}
		}
		log.info("Demo XP seeding completed (seeded {} of {} players).", seededCount, PLAYERS.size());
	}

	/** Two events this week (categories 0, 1) and two in past weeks (categories 2, 3), each half of the total. */
	private void seed(DemoPlayer player, SeedDates dates) {
		int weeklyFirstHalf = player.weeklyXp() / 2;
		int pastFirstHalf = player.pastXp() / 2;
		record(player, 0, "w1", weeklyFirstHalf, dates.thisWeek1());
		record(player, 1, "w2", player.weeklyXp() - weeklyFirstHalf, dates.thisWeek2());
		record(player, 2, "p1", pastFirstHalf, dates.pastWeek1());
		record(player, 3, "p2", player.pastXp() - pastFirstHalf, dates.pastWeek2());
	}

	private void record(DemoPlayer player, int categoryIndex, String part, int xp, Instant at) {
		String sourceRef = "seed-" + player.userId() + "-" + part;
		xpService.record(player.userId(), CATEGORIES.get(categoryIndex), XpSource.DUEL, sourceRef, xp, at);
	}

	private record DemoPlayer(String userId, int weeklyXp, int pastXp) {
	}

	private record SeedDates(Instant thisWeek1, Instant thisWeek2, Instant pastWeek1, Instant pastWeek2) {
	}

}
