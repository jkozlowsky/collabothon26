package com.collabothon.back.lesson;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.collabothon.back.xp.XpService;
import com.collabothon.back.xp.XpSource;

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

	private final XpService xpService;

	public Set<String> completed(String userId) {
		if (userId == null) {
			return Set.of();
		}
		return new HashSet<>(completions.findLessonIds(userId));
	}

	/** Records the first completion with its XP. Returns false if the lesson was already completed. */
	boolean complete(String userId, String lessonId, int xp) {
		String category = lessonId.replaceAll("-[0-9]+$", "");
		return complete(userId, lessonId, category, xp);
	}

	boolean complete(String userId, String lessonId, String category, int xp) {
		boolean first = completions.insertFirst(userId, lessonId, xp) == 1;
		if (first && xp > 0) {
			xpService.record(userId, category, XpSource.LESSON, lessonId, xp, Instant.now());
		}
		return first;
	}

	void recordActivity(String userId, LocalDate date) {
		activity.record(userId, date);
	}

	int totalXp(String userId) {
		return xpService.totalXp(userId);
	}

	void recordConcept(String userId, String concept, boolean correctFirstTry) {
		int correctVal = 0;
		if (correctFirstTry) {
			correctVal = 1;
		}
		concepts.record(userId, concept, correctVal);
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
