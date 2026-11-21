package com.collabothon.back.lesson;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/** Per-user lesson progress (V5 tables). */
@Component
@RequiredArgsConstructor
public class LessonProgress {

	private final LessonCompletionRepository completions;

	private final LessonActivityRepository activity;

	private final ConceptKnowledgeRepository concepts;

	private final ScenarioChoiceRepository scenarioChoices;

	private final VariantProfileRepository profiles;

	public Set<String> completed(String userId) {
		if (userId == null) {
			return Set.of();
		}
		return new HashSet<>(completions.findLessonIds(userId));
	}

	/** Records the first completion with its XP. Returns false if the lesson was already completed. */
	boolean complete(String userId, String lessonId, int xp) {
		return completions.insertFirst(userId, lessonId, xp) == 1;
	}

	void recordActivity(String userId, LocalDate date) {
		activity.record(userId, date);
	}

	int totalXp(String userId) {
		return completions.totalXp(userId);
	}

	void recordConcept(String userId, String concept, boolean correctFirstTry) {
		concepts.record(userId, concept, correctFirstTry ? 1 : 0);
	}

	void recordScenarioChoice(String userId, String lessonId, String stepId, int choice) {
		scenarioChoices.save(new ScenarioChoice(userId, lessonId, stepId, choice));
	}

	/** Empty when the user has no profile. */
	Optional<VariantProfile> variantProfile(String userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return profiles.findVariantProfile(userId);
	}

}
