package com.collabothon.back.profile.services;

import java.time.Clock;
import java.time.LocalDate;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.lesson.repositories.ConceptKnowledgeRepository;
import com.collabothon.back.lesson.repositories.LessonActivityRepository;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.ScenarioChoiceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DemoProgressService implements ApplicationRunner {

	public static final String DEMO_USER = "demo-user";

	private static final int SEED_OLD_START = 60;
	private static final int SEED_OLD_END = 49;
	private static final int SEED_RECENT_START = 4;
	private static final int SEED_RECENT_END = 1;

	private final LessonActivityRepository activities;
	private final LessonCompletionRepository completions;
	private final ConceptKnowledgeRepository concepts;
	private final ScenarioChoiceRepository scenarioChoices;
	private final Clock clock;

	@Override
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void run(ApplicationArguments args) {
		if (!activities.existsByIdUserId(DEMO_USER)) {
			seed(DEMO_USER, LocalDate.now(clock));
		}
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void reseed(String userId, LocalDate today) {
		activities.deleteByIdUserId(userId);
		completions.deleteByIdUserId(userId);
		concepts.deleteByIdUserId(userId);
		scenarioChoices.deleteByUserId(userId);
		seed(userId, today);
	}

	private void seed(String userId, LocalDate today) {
		for (int daysAgo = SEED_OLD_START; daysAgo >= SEED_OLD_END; daysAgo--) {
			activities.recordActivity(userId, today.minusDays(daysAgo));
		}
		for (int daysAgo = SEED_RECENT_START; daysAgo >= SEED_RECENT_END; daysAgo--) {
			activities.recordActivity(userId, today.minusDays(daysAgo));
		}
	}
}
