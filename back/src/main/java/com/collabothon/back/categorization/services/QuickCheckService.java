package com.collabothon.back.categorization.services;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.random.RandomGenerator;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.dto.StepRequestDto;
import com.collabothon.back.categorization.dto.StepResponseDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.mappers.JevStateMapper;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.CheckQuestion;
import com.collabothon.back.categorization.models.JevStepInput;
import com.collabothon.back.categorization.models.Measurement;
import com.collabothon.back.categorization.models.StepJudgement;
import com.collabothon.back.categorization.models.StepState;
import com.collabothon.back.lesson.models.Story;

import lombok.RequiredArgsConstructor;

// No @Transactional, as in CategorizationService: no DB connection is held during the Jev call.
@Service
@RequiredArgsConstructor
public class QuickCheckService {

	private final CategorizationService categorization;

	private final CheckQuestionService checkQuestions;

	private final JevProperties jevProperties;

	private final JevClient jev;

	private final JevStateMapper jevStateMapper;

	private final CategorizationDataService dataService;

	private final RandomGenerator random;

	public StepResponseDto step(String userId, StepRequestDto request) {
		OnboardingAnswersDto onboarding = categorization.onboarding(userId);
		List<Answer> answers = checkQuestions.resolve(request.history());
		List<Story> picked = OrderRules.picked(onboarding.interests(), checkQuestions.stories());
		StepState state = stepState(userId, request.profile(), answers, picked);
		boolean useRules = request.useRules() || !jevProperties.callsJev();
		boolean fellBackBefore = request.stepFellBack();
		if (useRules || fellBackBefore) {
			return byRule(state).withUseRules(useRules).withStepFellBack(fellBackBefore);
		}
		List<CheckLesson> choices = NextQuestionRules.nextLessonChoices(state.measurement().order(),
				OrderRules.lessons(state.open()));
		// Before the first answer Jev only chooses the lesson, so without a choice there is nothing to ask it.
		if (answers.isEmpty() && choices.size() < JevConsts.MIN_CHOICE_LABELS) {
			return byRule(state);
		}
		return jev.step(jevInput(request, picked, state.measurement(), choices))
			.map(judgement -> byJev(state, choices, judgement))
			.orElseGet(() -> byRule(state).withStepFellBack(true));
	}

	private StepState stepState(String userId, ProfileRangesDto profile, List<Answer> answers, List<Story> picked) {
		String horizon = Optional.ofNullable(profile).map(ProfileRangesDto::horizon).orElse(null);
		List<CheckQuestion> pool = OrderRules.pickedFirst(checkQuestions.pool(), picked);
		List<FocusArea> order = OrderRules.areaOrder(OrderRules.areasOf(picked), horizon, pool);
		Set<String> completed = dataService.completedLessonIds(userId);
		List<CheckQuestion> open = NextQuestionRules.askable(NextQuestionRules.open(pool, answers, completed), answers,
				picked);
		return new StepState(pool, open, Measurement.byRule(order, answers));
	}

	private JevStepInput jevInput(StepRequestDto request, List<Story> picked, Measurement measurement,
			List<CheckLesson> choices) {
		List<JevAnswerDto> answers = jevStateMapper.toAnswers(measurement.answers());
		List<FocusArea> answered = measurement.order().stream().filter(measurement::isAnswered).toList();
		return new JevStepInput(request.profile(), jevStateMapper.toInterests(picked), request.facts(), answers,
				answered, choices);
	}

	private StepResponseDto byRule(StepState state) {
		Optional<String> lesson = Optional.empty();
		if (!NextQuestionRules.ruleDone(state)) {
			lesson = NextQuestionRules.nextLesson(state);
		}
		return response(state.measurement().mastery(), state.open(), lesson);
	}

	private StepResponseDto byJev(StepState state, List<CheckLesson> choices, StepJudgement judgement) {
		// An area Jev was not asked about keeps the rule's mean.
		Map<FocusArea, Double> mastery = new LinkedHashMap<>(state.measurement().mastery());
		mastery.putAll(judgement.mastery());
		return response(mastery, state.open(), lessonByJev(state, choices, judgement));
	}

	private static Optional<String> lessonByJev(StepState state, List<CheckLesson> choices, StepJudgement judgement) {
		if (NextQuestionRules.jevDone(state, judgement.enough())) {
			return Optional.empty();
		}
		// A late answer keeps Jev's mastery and enough, but not its choice of lesson.
		if (judgement.elapsed().compareTo(JevConsts.STEP_BUDGET) > 0) {
			return NextQuestionRules.nextLesson(state);
		}
		// Jev is not asked to choose among fewer than two lessons.
		return Optional.of(judgement.nextLesson().orElseGet(choices::getFirst).id());
	}

	private StepResponseDto response(Map<FocusArea, Double> mastery, List<CheckQuestion> open,
			Optional<String> lesson) {
		Optional<String> next = lesson.map(id -> NextQuestionRules.draw(open, id, random).id());
		return StepResponseDto.builder()
			.mastery(FocusArea.byWire(mastery))
			.nextQuestionId(next.orElse(null))
			.done(next.isEmpty())
			.build();
	}

}
