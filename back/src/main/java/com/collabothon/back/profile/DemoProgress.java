package com.collabothon.back.profile;

import java.time.LocalDate;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo progress, relative to "today" so it never goes stale: a 12-day run two
 * months ago (the record) and a 4-day streak ending yesterday, so on stage today's lesson makes it 5.
 * Seeded for the demo user on startup if they have no progress yet, and again by the reset endpoint.
 */
@Component
class DemoProgress implements ApplicationRunner {

	static final String DEMO_USER = "demo-user";

	private final JdbcClient jdbc;

	DemoProgress(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (!jdbc.sql("SELECT EXISTS (SELECT 1 FROM lesson_activity WHERE user_id = ?)")
			.param(DEMO_USER).query(Boolean.class).single()) {
			seed(DEMO_USER, LocalDate.now());
		}
	}

	@Transactional
	void reseed(String userId, LocalDate today) {
		jdbc.sql("DELETE FROM lesson_activity WHERE user_id = ?").param(userId).update();
		jdbc.sql("DELETE FROM lesson_completion WHERE user_id = ?").param(userId).update();
		jdbc.sql("DELETE FROM concept_knowledge WHERE user_id = ?").param(userId).update();
		jdbc.sql("DELETE FROM scenario_choice WHERE user_id = ?").param(userId).update();
		seed(userId, today);
	}

	private void seed(String userId, LocalDate today) {
		for (int daysAgo = 60; daysAgo >= 49; daysAgo--) {
			recordDay(userId, today.minusDays(daysAgo));
		}
		for (int daysAgo = 4; daysAgo >= 1; daysAgo--) {
			recordDay(userId, today.minusDays(daysAgo));
		}
	}

	private void recordDay(String userId, LocalDate date) {
		jdbc.sql("INSERT INTO lesson_activity (user_id, completed_on) VALUES (?, ?) ON CONFLICT DO NOTHING")
			.params(userId, date).update();
	}

}
