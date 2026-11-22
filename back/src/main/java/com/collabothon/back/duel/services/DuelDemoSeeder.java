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
 * Runs once per week: skips each player individually if they already have XP this week.
 */
@Component
@ConditionalOnProperty(name = "app.duel.seed-demo-xp", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DuelDemoSeeder implements ApplicationRunner {

	private static final List<DemoPlayer> PLAYERS = List.of(
			// Existing players (unchanged)
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

	private final StoryRepository stories;

	private final DuelContentRepository content;

	@Override
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void run(ApplicationArguments args) {
		WeekWindow week = weekCalculator.currentWeek();

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

		int seededCount = 0;
		for (DemoPlayer player : PLAYERS) {
			if (!xpService.hasXpBetween(player.userId(), week.start(), week.end())) {
				if ("demo-user".equals(player.userId())) {
					record("demo-user", "berlin", "w1", 62, dates.thisWeek1());
					record("demo-user", "seoul", "w2", 63, dates.thisWeek2());
					record("demo-user", "sao-paulo", "p1", 60, dates.pastWeek1());
					record("demo-user", "tokyo", "p2", 60, dates.pastWeek2());
				}
				else {
					seedPlayer(player, categories, dates);
				}
				seededCount++;
			}
		}
		log.info("Demo XP seeding completed (seeded {} of {} players across {} categories).", seededCount, PLAYERS.size(), categories.size());
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
