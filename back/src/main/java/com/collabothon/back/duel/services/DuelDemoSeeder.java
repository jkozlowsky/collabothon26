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
 * part of it this week. Alex ({@code demo-user}) lands mid-table (rank 6, 125 XP), so winning a match moves them up.
 * Runs once per week: it skips when this week's rows exist.
 */
@Component
@ConditionalOnProperty(name = "app.duel.seed-demo-xp", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DuelDemoSeeder implements ApplicationRunner {

	private static final String MARKER_USER = "demo-tomasz";

	private static final List<String> CATEGORIES = List.of("berlin", "seoul", "sao-paulo", "tokyo");

	private static final List<DemoPlayer> PLAYERS = List.of(
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
			new DemoPlayer("demo-ewa", 10, 20));

	private final XpService xpService;

	private final XpWeekCalculator weekCalculator;

	@Override
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void run(ApplicationArguments args) {
		WeekWindow week = weekCalculator.currentWeek();
		if (xpService.hasXpBetween(MARKER_USER, week.start(), week.end())) {
			log.info("Demo XP rows for current week already exist; skipping seeding.");
			return;
		}
		Instant weekStart = week.start();
		SeedDates dates = new SeedDates(weekStart.plus(Duration.ofHours(12)), weekStart.plus(Duration.ofHours(36)),
				weekStart.minus(Duration.ofDays(7)), weekStart.minus(Duration.ofDays(16)));
		PLAYERS.forEach(player -> seed(player, dates));
		log.info("Demo XP seeding completed.");
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
