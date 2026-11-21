package com.collabothon.back.profile;

import java.time.LocalDate;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.lesson.ConceptKnowledgeRepository;
import com.collabothon.back.lesson.LessonActivityRepository;
import com.collabothon.back.lesson.LessonCompletionRepository;
import com.collabothon.back.lesson.ScenarioChoiceRepository;

import lombok.RequiredArgsConstructor;

/**
 * Demo progress, relative to "today" so it never goes stale: a 12-day run two
 * months ago (the record) and a 4-day streak ending yesterday, so on stage today's lesson makes it 5.
 * Seeded for the demo user on startup if they have no progress yet, and again by the reset endpoint.
 */
@Component
@RequiredArgsConstructor
class DemoProgress implements ApplicationRunner {

	static final String DEMO_USER = "demo-user";

	private final LessonActivityRepository activity;

	private final LessonCompletionRepository completions;

	private final ConceptKnowledgeRepository concepts;

	private final ScenarioChoiceRepository scenarioChoices;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (!activity.existsByUserId(DEMO_USER)) {
			seed(DEMO_USER, LocalDate.now());
		}
	}

	@Transactional
	void reseed(String userId, LocalDate today) {
		activity.deleteByUserId(userId);
		completions.deleteByUserId(userId);
		concepts.deleteByUserId(userId);
		scenarioChoices.deleteByUserId(userId);
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
		activity.record(userId, date);
	}

}
