package com.collabothon.back.duel;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.xp.XpService;
import com.collabothon.back.xp.XpSource;

import lombok.RequiredArgsConstructor;

/**
 * Dev-only demo seeding: seeds xp_event rows for demo-* accounts relative to now()
 * spread over the last ~3 weeks with a good share this week.
 * Alex ('demo-user') lands mid-table (rank 6 with 125 XP), so winning a match moves them up.
 */
@Component
@ConditionalOnProperty(name = "app.duel.seed-demo-xp", havingValue = "true")
@RequiredArgsConstructor
public class DuelDemoSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DuelDemoSeeder.class);

	private static final List<String> CATEGORIES = List.of("berlin", "seoul", "sao-paulo", "tokyo");

	private final JdbcClient jdbc;

	private final XpService xpService;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		XpService.WeekWindow window = xpService.currentWeekWindow();
		Boolean exists = jdbc.sql("""
				SELECT EXISTS (
				    SELECT 1 FROM xp_event
				    WHERE user_id = 'demo-tomasz' AND created_at >= ? AND created_at < ?
				)
				""")
			.params(java.sql.Timestamp.from(window.start()), java.sql.Timestamp.from(window.end()))
			.query(Boolean.class)
			.single();
		if (Boolean.TRUE.equals(exists)) {
			log.info("Demo XP rows for current week already exist; skipping seeding.");
			return;
		}
		seed(window);
	}

	@Transactional
	public void seed(XpService.WeekWindow window) {
		Instant now = Instant.now();
		// Current week events (dated within window: 1-2 days ago or at start of week)
		Instant thisWeek1 = window.start().plus(Duration.ofHours(12));
		Instant thisWeek2 = window.start().plus(Duration.ofHours(36));
		Instant pastWeek1 = window.start().minus(Duration.ofDays(7));
		Instant pastWeek2 = window.start().minus(Duration.ofDays(16));

		// Targets: (userId, weeklyXp, pastXp)
		seedUser("demo-tomasz", 310, 300, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-ola", 265, 250, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-marta", 220, 200, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-jonas", 180, 180, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-kasia", 150, 150, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-user", 125, 120, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-piotr", 90, 90, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-sofia", 60, 60, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-marek", 40, 50, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-lukas", 30, 40, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-nina", 20, 30, thisWeek1, thisWeek2, pastWeek1, pastWeek2);
		seedUser("demo-ewa", 10, 20, thisWeek1, thisWeek2, pastWeek1, pastWeek2);

		log.info("Demo XP seeding completed.");
	}

	private void seedUser(String userId, int weeklyXp, int pastXp, Instant w1, Instant w2, Instant p1, Instant p2) {
		// Split weekly XP into two events
		int wPart1 = weeklyXp / 2;
		int wPart2 = weeklyXp - wPart1;
		if (wPart1 > 0) {
			xpService.record(userId, CATEGORIES.get(0), XpSource.DUEL, "seed-" + userId + "-w1", wPart1, w1);
		}
		if (wPart2 > 0) {
			xpService.record(userId, CATEGORIES.get(1), XpSource.DUEL, "seed-" + userId + "-w2", wPart2, w2);
		}

		// Split past XP into two events
		int pPart1 = pastXp / 2;
		int pPart2 = pastXp - pPart1;
		if (pPart1 > 0) {
			xpService.record(userId, CATEGORIES.get(2), XpSource.DUEL, "seed-" + userId + "-p1", pPart1, p1);
		}
		if (pPart2 > 0) {
			xpService.record(userId, CATEGORIES.get(3), XpSource.DUEL, "seed-" + userId + "-p2", pPart2, p2);
		}
	}

}
