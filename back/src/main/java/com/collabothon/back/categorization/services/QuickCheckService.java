package com.collabothon.back.categorization.services;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.StepRequestDto;
import com.collabothon.back.categorization.dto.StepResponseDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.mappers.JevAnswerMapper;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

import lombok.RequiredArgsConstructor;

// Stateless: the front sends the whole history with every step.
@Service
@RequiredArgsConstructor
public class QuickCheckService {

	private final CategorizationService categorization;

	private final CheckQuestionService checkQuestions;

	private final JevProperties jevProperties;

	private final JevClient jev;

	private final JevAnswerMapper jevAnswerMapper;

	public StepResponseDto step(String userId, StepRequestDto request) {
		OnboardingAnswersDto onboarding = categorization.onboarding(userId);
		List<CheckQuestionProjection> bank = checkQuestions.bank();
		List<Answer> answers = checkQuestions.resolve(request.history(), bank);
		String horizon = request.profile() == null ? null : request.profile().horizon();
		List<FocusArea> order = QuickCheckRules.areaOrder(onboarding.goals(), horizon, bank);
		Map<FocusArea, Double> ruleMastery = QuickCheckRules.mastery(order, answers);
		boolean useRules = request.useRules() || !jevProperties.callsJev();
		if (answers.isEmpty() || useRules || request.stepFellBack()) {
			return byRule(order, bank, answers, horizon, ruleMastery, useRules, request.stepFellBack());
		}
		List<CheckQuestionProjection> unasked = QuickCheckRules.unasked(bank, answers);
		Map<String, String> criteria = new LinkedHashMap<>();
		unasked.forEach(q -> criteria.put(q.id(), q.checks()));
		List<FocusArea> answered = order.stream().filter(area -> !QuickCheckRules.inArea(answers, area).isEmpty())
			.toList();
		Optional<StepJudgement> fromJev = jev.step(request.profile(), onboarding.goals(), request.facts(),
				answers.stream().map(jevAnswerMapper::toJev).toList(), answered, criteria);
		if (fromJev.isEmpty()) {
			return byRule(order, bank, answers, horizon, ruleMastery, false, true);
		}
		StepJudgement j = fromJev.get();
		Map<FocusArea, Double> mastery = new LinkedHashMap<>();
		order.forEach(area -> mastery.put(area, j.mastery().getOrDefault(area, ruleMastery.get(area))));
		Optional<CheckQuestionProjection> next;
		if (QuickCheckRules.jevDone(unasked, answers, j.enough())) {
			next = Optional.empty();
		}
		else if (j.elapsed().compareTo(JevConsts.STEP_BUDGET) > 0) {
			next = QuickCheckRules.next(order, bank, answers, horizon);
		}
		else {
			CheckQuestionProjection picked = j.next() == null ? unasked.getFirst()
					: unasked.stream().filter(q -> q.id().equals(j.next())).findFirst().orElseThrow();
			next = Optional.of(QuickCheckRules.shortHorizon(picked, unasked, horizon));
		}
		return response(mastery, next, false, false);
	}

	private static StepResponseDto byRule(List<FocusArea> order, List<CheckQuestionProjection> bank,
			List<Answer> answers, String horizon, Map<FocusArea, Double> mastery, boolean useRules,
			boolean stepFellBack) {
		Optional<CheckQuestionProjection> next = QuickCheckRules.ruleDone(order, QuickCheckRules.unasked(bank, answers),
				answers) ? Optional.empty() : QuickCheckRules.next(order, bank, answers, horizon);
		return response(mastery, next, useRules, stepFellBack);
	}

	private static StepResponseDto response(Map<FocusArea, Double> mastery, Optional<CheckQuestionProjection> next,
			boolean useRules, boolean stepFellBack) {
		return new StepResponseDto(QuickCheckRules.byWire(mastery), next.map(CheckQuestionProjection::id).orElse(null),
				next.isEmpty(), useRules, stepFellBack);
	}

}
