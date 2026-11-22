package com.collabothon.back.lesson.services;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.consts.TimeConsts;
import com.collabothon.back.dto.lesson.ResultRequest;
import com.collabothon.back.dto.lesson.ResultResponse;
import com.collabothon.back.dto.lesson.StepResult;
import com.collabothon.back.entities.lesson.ScenarioChoice;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.LessonContentItem;
import com.collabothon.back.lesson.models.LessonJson;
import com.collabothon.back.lesson.repositories.ConceptKnowledgeRepository;
import com.collabothon.back.lesson.repositories.LessonActivityRepository;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.ScenarioChoiceRepository;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
public class LessonResultService {

	private final LessonProgression progression;

	private final LessonCompletionRepository completions;

	private final LessonActivityRepository activities;

	private final ConceptKnowledgeRepository conceptKnowledge;

	private final ScenarioChoiceRepository scenarioChoices;

	private final XpService xpService;

	private final Clock clock;

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public ResultResponse recordResult(String id, String userId, ResultRequest request) {
		LessonContentItem lesson = progression.lessonOrNotFound(id);
		progression.requireUnlocked(lesson, userId);
		Instant now = clock.instant();

		request.steps().forEach(result -> recordConcepts(lesson, userId, result));
		Map<String, Integer> choices = Objects.requireNonNullElse(request.scenarioChoices(), Map.of());
		choices.forEach((stepId, choice) -> recordScenarioChoice(lesson, userId, stepId, choice, now));
		int xpAwarded = 0;
		boolean first = completions.insertIfAbsent(userId, id, lesson.xp(), now, request.mode()) == 1;
		if (first) {
			xpService.awardLesson(userId, id, lesson.story(), lesson.xp(), now);
			xpAwarded = lesson.xp();
		}
		recordActivity(userId, request.completedOn(), now);

		return new ResultResponse(xpAwarded, first, xpService.totalXp(userId), progression.nextLessonId(lesson));
	}

	// A graded step counts towards its own concepts, or the lesson's when it names none.
	private void recordConcepts(LessonContentItem lesson, String userId, StepResult result) {
		JsonNode step = stepOrBadRequest(lesson, result.stepId());
		if (!LessonConsts.GRADED.contains(step.path("type").asString())) {
			return;
		}
		JsonNode concepts = lesson.node().path("concepts");
		if (step.has("concepts")) {
			concepts = step.get("concepts");
		}
		int correct = 0;
		if (result.correctFirstTry()) {
			correct = 1;
		}
		for (JsonNode concept : concepts) {
			conceptKnowledge.recordConcept(userId, concept.asString(), correct);
		}
	}

	private void recordScenarioChoice(LessonContentItem lesson, String userId, String stepId, Integer choice,
			Instant at) {
		JsonNode step = stepOrBadRequest(lesson, stepId);
		boolean valid = LessonConsts.SCENARIO.equals(step.path("type").asString()) && choice != null && choice >= 0
				&& choice < step.path("choices").size();
		if (!valid) {
			throw new BusinessException(LessonErrorCode.INVALID_SCENARIO_CHOICE, stepId);
		}
		scenarioChoices.save(ScenarioChoice.builder()
			.userId(userId)
			.lessonId(lesson.id())
			.stepId(stepId)
			.choice(choice)
			.createdAt(at)
			.build());
	}

	private void recordActivity(String userId, LocalDate completedOn, Instant now) {
		LocalDate day = Objects.requireNonNullElse(completedOn,
				LocalDate.ofInstant(now, TimeConsts.DEFAULT_ACTIVITY_ZONE));
		activities.recordActivity(userId, day);
	}

	private static JsonNode stepOrBadRequest(LessonContentItem lesson, String stepId) {
		return LessonJson.findStep(lesson.node(), stepId)
			.orElseThrow(() -> new BusinessException(LessonErrorCode.INVALID_STEP, "no step '" + stepId + "'"));
	}

}
