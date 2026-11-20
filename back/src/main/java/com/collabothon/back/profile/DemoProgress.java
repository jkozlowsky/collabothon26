package com.collabothon.back.profile;

import java.time.LocalDate;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Demo progress, relative to "today" so it never goes stale: lessons 1 and 2 done, a 12-day run two
 * months ago (the record) and a 4-day streak ending yesterday, so on stage today's lesson makes it 5.
 * Seeded for the demo user on startup if they have no progress yet, and again by the reset endpoint.
 */
@Component
class DemoProgress implements ApplicationRunner {

	static final String DEMO_USER = "demo-user";

	private final LessonCompletionRepository completions;

	DemoProgress(LessonCompletionRepository completions) {
		this.completions = completions;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (completions.findByUserId(DEMO_USER).isEmpty()) {
			seed(DEMO_USER, LocalDate.now());
		}
	}

	@Transactional
	void reseed(String userId, LocalDate today) {
		completions.deleteByUserId(userId);
		seed(userId, today);
	}

	private void seed(String userId, LocalDate today) {
		// The record: 12 days in a row, 60 to 49 days ago. First completions earn the lesson XP (V2 seed).
		completions.save(new LessonCompletion(userId, 1L, today.minusDays(60), 50));
		completions.save(new LessonCompletion(userId, 2L, today.minusDays(59), 70));
		for (int daysAgo = 58; daysAgo >= 49; daysAgo--) {
			completions.save(new LessonCompletion(userId, 2L, today.minusDays(daysAgo), 0));
		}
		// The current streak: 4 days ending yesterday, so today is "at risk".
		for (int daysAgo = 4; daysAgo >= 1; daysAgo--) {
			completions.save(new LessonCompletion(userId, 1L, today.minusDays(daysAgo), 0));
		}
	}

}
