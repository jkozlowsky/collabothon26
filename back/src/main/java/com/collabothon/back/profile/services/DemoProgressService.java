package com.collabothon.back.profile.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.lesson.repositories.ConceptKnowledgeRepository;
import com.collabothon.back.lesson.repositories.LessonActivityRepository;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.ScenarioChoiceRepository;

import lombok.RequiredArgsConstructor;

/** Wipes a user's learning progress so the demo can start again from a fresh account (no streak, no XP). */
@Service
@RequiredArgsConstructor
public class DemoProgressService {

	private final LessonActivityRepository activities;
	private final LessonCompletionRepository completions;
	private final ConceptKnowledgeRepository concepts;
	private final ScenarioChoiceRepository scenarioChoices;

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void reset(String userId) {
		activities.deleteByIdUserId(userId);
		completions.deleteByIdUserId(userId);
		concepts.deleteByIdUserId(userId);
		scenarioChoices.deleteByUserId(userId);
	}
}
