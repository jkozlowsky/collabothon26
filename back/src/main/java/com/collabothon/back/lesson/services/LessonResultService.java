package com.collabothon.back.lesson.services;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.lesson.ResultRequest;
import com.collabothon.back.dto.lesson.ResultResponse;
import com.collabothon.back.dto.lesson.StepResult;
import com.collabothon.back.entities.lesson.ScenarioChoice;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.ConceptKnowledgeRepository;
import com.collabothon.back.lesson.repositories.LessonActivityRepository;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.ScenarioChoiceRepository;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Records a finished lesson: concept knowledge per graded step, scenario choices, the first completion with its XP,
 * and the day's activity for the streak.
 */
@Service
@RequiredArgsConstructor
public class LessonResultService {

	private final LessonProgression progression;

	private final LessonCompletionRepository completionRepo;

	private final LessonActivityRepository activityRepo;

	private final ConceptKnowledgeRepository conceptKnowledgeRepo;

	private final ScenarioChoiceRepository scenarioChoiceRepo;

	private final XpService xpService;

	private final Clock clock;

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public ResultResponse recordResult(String id, String userId, ResultRequest req) {
		ObjectNode lesson = progression.lessonOrNotFound(id);
		progression.requireUnlocked(lesson, userId);
		Instant now = clock.instant();

		for (StepResult result : req.steps()) {
			recordConcepts(lesson, userId, result);
		}
		Map<String, Integer> scenarioChoices = Objects.requireNonNullElse(req.scenarioChoices(), Map.of());
		scenarioChoices.forEach((stepId, choice) -> recordScenarioChoice(lesson, userId, stepId, choice, now));

		int xp = lesson.path("xp").asInt(0);
		boolean first = completionRepo.insertIfAbsent(userId, id, xp, now) == 1;
		if (first) {
			xpService.awardLesson(userId, id, lesson.path("story").asString(), xp, now);
		}
		LocalDate activityDate = Objects.requireNonNullElse(req.completedOn(), LocalDate.ofInstant(now, ZoneOffset.UTC));
		activityRepo.recordActivity(userId, activityDate);

		int xpAwarded = 0;
		if (first) {
			xpAwarded = xp;
		}
		return new ResultResponse(xpAwarded, first, xpService.totalXp(userId), progression.nextLessonId(lesson));
	}

	/** A graded step counts towards the step's concepts, or the lesson's when the step names none. */
	private void recordConcepts(ObjectNode lesson, String userId, StepResult result) {
		JsonNode step = stepOrBadRequest(lesson, result.stepId());
		if (!LessonRules.GRADED.contains(step.path("type").asString())) {
			return;
		}
		JsonNode concepts = lesson.path("concepts");
		if (step.has("concepts")) {
			concepts = step.get("concepts");
		}
		int correct = 0;
		if (result.correctFirstTry()) {
			correct = 1;
		}
		for (JsonNode concept : concepts) {
			conceptKnowledgeRepo.recordConcept(userId, concept.asString(), correct);
		}
	}

	private void recordScenarioChoice(ObjectNode lesson, String userId, String stepId, Integer choice, Instant at) {
		JsonNode step = stepOrBadRequest(lesson, stepId);
		boolean valid = "scenario".equals(step.path("type").asString()) && choice != null && choice >= 0
				&& choice < step.path("choices").size();
		if (!valid) {
			throw new BusinessException(LessonErrorCode.INVALID_SCENARIO_CHOICE, stepId);
		}
		scenarioChoiceRepo.save(ScenarioChoice.builder()
			.userId(userId)
			.lessonId(lesson.path("id").asString())
			.stepId(stepId)
			.choice(choice)
			.createdAt(at)
			.build());
	}

	private static JsonNode stepOrBadRequest(JsonNode lesson, String stepId) {
		try {
			return LessonRules.step(lesson, stepId);
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(LessonErrorCode.INVALID_STEP, e.getMessage());
		}
	}

}
