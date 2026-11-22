package com.collabothon.back.categorization.services;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.random.RandomGenerator;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.StepRequestDto;
import com.collabothon.back.categorization.dto.StepResponseDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.mappers.JevInterestMapper;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;

import lombok.RequiredArgsConstructor;

/** One step of the Quick check: Jev or the rule picks the lesson, the question is drawn from it at random. */
@Service
@RequiredArgsConstructor
public class QuickCheckService {

	private final CategorizationService categorization;

	private final CheckQuestionService checkQuestions;

	private final JevProperties jevProperties;

	private final JevClient jev;

	private final JevInterestMapper jevInterestMapper;

	private final LessonCompletionRepository completions;

	private final RandomGenerator random;

	public StepResponseDto step(String userId, StepRequestDto request) {
		OnboardingAnswersDto onboarding = categorization.onboarding(userId);
		List<CheckQuestion> pool = checkQuestions.pool();
		List<Answer> answers = checkQuestions.resolve(request.history());
		String horizon = request.profile() == null ? null : request.profile().horizon();
		List<Story> stories = categorization.stories();
		List<FocusArea> order = QuickCheckRules.areaOrder(FocusArea.fromInterests(onboarding.interests(), stories),
				horizon, pool);
		Set<String> completed = new HashSet<>(completions.findLessonIdsByUserId(userId));
		List<CheckQuestion> open = QuickCheckRules.open(pool, answers, completed);
		Map<FocusArea, Double> ruleMastery = QuickCheckRules.mastery(order, answers);
		boolean useRules = request.useRules() || !jevProperties.callsJev();
		if (useRules || request.stepFellBack()) {
			return byRule(order, pool, open, answers, ruleMastery, useRules, request.stepFellBack());
		}
		List<CheckLesson> choices = QuickCheckRules.nextLessonChoices(order, QuickCheckRules.lessons(open));
		// Before the first answer Jev only chooses the lesson, so without a choice there is nothing to ask it.
		if (answers.isEmpty() && choices.size() < JevConsts.MIN_CHOICE_LABELS) {
			return byRule(order, pool, open, answers, ruleMastery, false, false);
		}
		List<FocusArea> answered = order.stream().filter(area -> !QuickCheckRules.inArea(answers, area).isEmpty())
			.toList();
		Optional<StepJudgement> fromJev = jev.step(request.profile(),
				jevInterestMapper.toJev(Story.picked(onboarding.interests(), stories)), request.facts(),
				answers.stream().map(Answer::toJev).toList(), answered, choices);
		if (fromJev.isEmpty()) {
			return byRule(order, pool, open, answers, ruleMastery, false, true);
		}
		StepJudgement j = fromJev.get();
		Map<FocusArea, Double> mastery = new LinkedHashMap<>();
		order.forEach(area -> mastery.put(area, j.mastery().getOrDefault(area, ruleMastery.get(area))));
		Optional<String> lesson;
		if (QuickCheckRules.jevDone(open, answers, j.enough())) {
			lesson = Optional.empty();
		}
		else if (j.elapsed().compareTo(JevConsts.STEP_BUDGET) > 0) {
			lesson = QuickCheckRules.nextLesson(order, pool, open, answers);
		}
		else {
			// Jev is not asked to choose among fewer than two lessons.
			lesson = Optional.of(j.nextLesson() == null ? choices.getFirst().id() : j.nextLesson());
		}
		return response(mastery, open, lesson, false, false);
	}

	private StepResponseDto byRule(List<FocusArea> order, List<CheckQuestion> pool, List<CheckQuestion> open,
			List<Answer> answers, Map<FocusArea, Double> mastery, boolean useRules, boolean stepFellBack) {
		Optional<String> lesson = QuickCheckRules.ruleDone(order, open, answers) ? Optional.empty()
				: QuickCheckRules.nextLesson(order, pool, open, answers);
		return response(mastery, open, lesson, useRules, stepFellBack);
	}

	private StepResponseDto response(Map<FocusArea, Double> mastery, List<CheckQuestion> open, Optional<String> lesson,
			boolean useRules, boolean stepFellBack) {
		Optional<String> next = lesson.map(id -> QuickCheckRules.draw(open, id, random).id());
		return new StepResponseDto(QuickCheckRules.byWire(mastery), next.orElse(null), next.isEmpty(), useRules,
				stepFellBack);
	}

}
