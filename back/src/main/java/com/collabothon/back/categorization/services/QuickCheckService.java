package com.collabothon.back.categorization.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.StepRequestDto;
import com.collabothon.back.categorization.dto.StepResponseDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

import lombok.RequiredArgsConstructor;

// Stateless: the front sends the whole history with every step.
@Service
@RequiredArgsConstructor
public class QuickCheckService {

	private final CategorizationService categorization;

	private final CheckQuestionService checkQuestions;

	private final JevProperties jevProperties;

	public StepResponseDto step(String userId, StepRequestDto request) {
		OnboardingAnswersDto onboarding = categorization.onboarding(userId);
		List<CheckQuestionProjection> bank = checkQuestions.bank();
		List<Answer> answers = checkQuestions.resolve(request.history(), bank);
		String horizon = request.profile() == null ? null : request.profile().horizon();
		List<FocusArea> order = QuickCheckRules.areaOrder(onboarding.goals(), horizon, bank);
		boolean useRules = request.useRules() || !jevProperties.callsJev();
		return byRule(order, bank, answers, horizon, QuickCheckRules.mastery(order, answers), useRules);
	}

	private static StepResponseDto byRule(List<FocusArea> order, List<CheckQuestionProjection> bank,
			List<Answer> answers, String horizon, Map<FocusArea, Double> mastery, boolean useRules) {
		Optional<CheckQuestionProjection> next = QuickCheckRules.ruleDone(order, QuickCheckRules.unasked(bank, answers),
				answers) ? Optional.empty() : QuickCheckRules.next(order, bank, answers, horizon);
		return new StepResponseDto(QuickCheckRules.byWire(mastery), next.map(CheckQuestionProjection::id).orElse(null),
				next.isEmpty(), useRules);
	}

}
