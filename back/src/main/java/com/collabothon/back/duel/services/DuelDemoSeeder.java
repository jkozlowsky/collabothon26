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

import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.services.WeekWindow;
import com.collabothon.back.xp.services.XpService;
import com.collabothon.back.xp.services.XpWeekCalculator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Dev-only demo data for the weekly ranking: XP for the demo-* accounts across all categories with duel files,
 * dated relative to the current week. Alex ({@code demo-user}) keeps the fixed original rows (rank 6, 125 weekly XP,
 * 120 past XP across berlin, seoul, sao-paulo, tokyo).
 * One demo account ({@code demo-kasia}) is 3 weekly XP above demo-user (128 XP vs 125 XP), so one won match moves Alex up.
 * Runs once per week: it skips when this week's rows exist.
 */
@Component
@ConditionalOnProperty(name = "app.duel.seed-demo-xp", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DuelDemoSeeder implements ApplicationRunner {

	private static final String MARKER_USER = "demo-tomasz";

	private static final List<DemoPlayer> PLAYERS = List.of(
			new DemoPlayer("demo-tomasz", 310, 300),
			new DemoPlayer("demo-ola", 265, 250),
			new DemoPlayer("demo-marta", 220, 200),
			new DemoPlayer("demo-jonas", 180, 180),
			new DemoPlayer("demo-kasia", 128, 150), // 3 XP above demo-user (125)
			new DemoPlayer("demo-user", 125, 120),
			new DemoPlayer("demo-piotr", 90, 90),
			new DemoPlayer("demo-sofia", 60, 60),
			new DemoPlayer("demo-marek", 40, 50),
			new DemoPlayer("demo-lukas", 30, 40),
			new DemoPlayer("demo-nina", 20, 30),
			new DemoPlayer("demo-ewa", 10, 20));

	private final XpService xpService;

	private final XpWeekCalculator weekCalculator;

	private final StoryRepository stories;

	private final DuelContentRepository content;

	@Override
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void run(ApplicationArguments args) {
		WeekWindow week = weekCalculator.currentWeek();
		if (xpService.hasXpBetween(MARKER_USER, week.start(), week.end())) {
			log.info("Demo XP rows for current week already exist; skipping seeding.");
			return;
		}

		List<String> categories = stories.findAll().stream()
			.map(Story::id)
			.filter(content::hasDuelContent)
			.toList();

		if (categories.isEmpty()) {
			log.warn("No stories with duel content found; skipping demo XP seeding.");
			return;
		}

		Instant weekStart = week.start();
		SeedDates dates = new SeedDates(weekStart.plus(Duration.ofHours(12)), weekStart.plus(Duration.ofHours(36)),
				weekStart.minus(Duration.ofDays(7)), weekStart.minus(Duration.ofDays(16)));

		for (DemoPlayer player : PLAYERS) {
			if ("demo-user".equals(player.userId())) {
				record("demo-user", "berlin", "w1", 62, dates.thisWeek1());
				record("demo-user", "seoul", "w2", 63, dates.thisWeek2());
				record("demo-user", "sao-paulo", "p1", 60, dates.pastWeek1());
				record("demo-user", "tokyo", "p2", 60, dates.pastWeek2());
			}
			else {
				seedPlayer(player, categories, dates);
			}
		}
		log.info("Demo XP seeding completed for {} categories.", categories.size());
	}

	private void seedPlayer(DemoPlayer player, List<String> categories, SeedDates dates) {
		int m = categories.size();
		for (int i = 0; i < m; i++) {
			String category = categories.get(i);
			int weekly = player.weeklyXp() / m + (i < (player.weeklyXp() % m) ? 1 : 0);
			int past = player.pastXp() / m + (i < (player.pastXp() % m) ? 1 : 0);

			Instant thisWeek = (i % 2 == 0) ? dates.thisWeek1() : dates.thisWeek2();
			Instant pastWeek = (i % 2 == 0) ? dates.pastWeek1() : dates.pastWeek2();

			if (weekly > 0) {
				record(player.userId(), category, "w", weekly, thisWeek);
			}
			if (past > 0) {
				record(player.userId(), category, "p", past, pastWeek);
			}
		}
	}

	private void record(String userId, String category, String part, int xp, Instant at) {
		String sourceRef = "seed-" + userId + "-" + part;
		xpService.record(userId, category, XpSource.DUEL, sourceRef, xp, at);
	}

	private record DemoPlayer(String userId, int weeklyXp, int pastXp) {
	}

	private record SeedDates(Instant thisWeek1, Instant thisWeek2, Instant pastWeek1, Instant pastWeek2) {
	}

}
