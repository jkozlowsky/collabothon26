package com.collabothon.back.categorization.services;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.CategorizationRequestDto;
import com.collabothon.back.categorization.dto.GapDto;
import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.dto.SharedWithModelDto;
import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.mappers.JevStateMapper;
import com.collabothon.back.categorization.mappers.OnboardingAnswersMapper;
import com.collabothon.back.categorization.mappers.StartLessonMapper;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.CategorizationInput;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.CheckQuestion;
import com.collabothon.back.categorization.models.JevQuickCheck;
import com.collabothon.back.categorization.models.JevResult;
import com.collabothon.back.categorization.models.Judgement;
import com.collabothon.back.categorization.models.Learner;
import com.collabothon.back.categorization.models.Measurement;
import com.collabothon.back.categorization.models.PathInput;
import com.collabothon.back.categorization.models.StoryPlan;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

// No @Transactional: CategorizationDataService commits each statement, so no connection is held during the Jev call.
@Service
@RequiredArgsConstructor
@Slf4j
public class CategorizationService {

	private final CategorizationDataService dataService;

	private final LessonContentRepository content;

	private final CheckQuestionService checkQuestions;

	private final JevClient jev;

	private final OnboardingAnswersMapper onboardingMapper;

	private final JevStateMapper jevStateMapper;

	private final StartLessonMapper startLessonMapper;

	private final JsonMapper json;

	private final Clock clock;

	public CategorizationDto categorize(String userId, CategorizationRequestDto request) {
		OnboardingAnswersDto onboarding = onboarding(userId);
		List<Answer> history = checkedHistory(request);
		CategorizationInput input = new CategorizationInput(userId, request, onboarding, history, Instant.now(clock));
		Optional<CategorizationDto> recent = recentJevResult(input);
		if (recent.isPresent()) {
			return recent.get();
		}
		PathInput paths = pathInput(input);
		JevResult fromJev = askJev(input, paths);
		CategorizationDto categorization = categorization(input, paths, fromJev);
		save(categorization);
		return categorization.withStartHere(startHere(categorization, paths.lessons(), paths.completed()));
	}

	public CategorizationDto get(String userId) {
		return find(userId).orElseThrow(() -> new BusinessException(CategorizationErrorCode.NOT_CATEGORISED_YET));
	}

	public OnboardingAnswersDto onboarding(String userId) {
		return dataService.findAnswers(userId)
			.map(onboardingMapper::toAnswers)
			.orElseThrow(() -> new BusinessException(CategorizationErrorCode.FINISH_ONBOARDING_FIRST));
	}

	// Without the ranges the Quick check did not run, so its fields are ignored, not checked against the pool.
	private List<Answer> checkedHistory(CategorizationRequestDto request) {
		if (request.profile() == null) {
			return List.of();
		}
		List<Answer> history = checkQuestions.resolve(request.history());
		requireMasteryOnlyForQuestionAreas(request.mastery().keySet());
		return history;
	}

	private void requireMasteryOnlyForQuestionAreas(Set<String> areas) {
		Set<String> questionAreas = checkQuestions.pool().stream()
			.map(question -> question.area().wire())
			.collect(Collectors.toSet());
		if (!questionAreas.containsAll(areas)) {
			throw new BusinessException(CategorizationErrorCode.MASTERY_ONLY_FOR_QUESTION_AREAS);
		}
	}

	private Optional<CategorizationDto> recentJevResult(CategorizationInput input) {
		CategorizationRequestDto request = input.request();
		if (request.profile() != null || request.useRules()) {
			return Optional.empty();
		}
		return find(input.userId()).filter(stored -> isReusable(stored, input));
	}

	private static boolean isReusable(CategorizationDto stored, CategorizationInput input) {
		boolean jevWithoutQuickCheck = stored.source() == CategorizationSource.JEV && stored.profile() == null
				&& stored.answerCount() == 0;
		SharedWithModelDto shared = stored.sharedWithModel();
		if (!jevWithoutQuickCheck || shared == null) {
			return false;
		}
		CategorizationRequestDto request = input.request();
		boolean sameInput = request.consent().equals(stored.consent())
				&& input.onboarding().equals(shared.answers())
				&& Objects.equals(request.facts(), shared.facts());
		return sameInput && stored.categorizedAt().isAfter(input.at().minus(CategorizationConsts.RECATEGORIZE_AFTER));
	}

	private PathInput pathInput(CategorizationInput input) {
		List<Story> stories = checkQuestions.stories();
		List<Story> picked = OrderRules.picked(input.onboarding().interests(), stories);
		List<CheckQuestion> pool = checkQuestions.pool();
		String horizon = input.quickCheckProfile().map(ProfileRangesDto::horizon).orElse(null);
		List<FocusArea> order = OrderRules.areaOrder(OrderRules.areasOf(picked), horizon, pool);
		return new PathInput(stories, picked, OrderRules.lessons(OrderRules.pickedFirst(pool, picked)),
				dataService.completedLessonIds(input.userId()), measurement(input, order));
	}

	// The app sends the last step's mastery; an answered area without a value takes the rule's.
	private static Measurement measurement(CategorizationInput input, List<FocusArea> order) {
		List<Answer> history = input.history();
		if (history.isEmpty()) {
			return new Measurement(order, Map.of(), history);
		}
		Map<String, Double> sent = input.request().mastery();
		Map<FocusArea, Double> mastery = new LinkedHashMap<>(Measurement.byRule(order, history).mastery());
		for (FocusArea area : order) {
			Double value = sent.get(area.wire());
			if (value != null) {
				mastery.put(area, value);
			}
		}
		return new Measurement(order, mastery, history);
	}

	private JevResult askJev(CategorizationInput input, PathInput paths) {
		CategorizationRequestDto request = input.request();
		if (request.useRules()) {
			return JevResult.SKIPPED;
		}
		Optional<JevQuickCheck> quickCheck = input.quickCheckProfile().map(profile -> jevQuickCheck(profile, paths));
		return jev.ask(input.onboarding(), jevStateMapper.toInterests(paths.picked()), request.facts(), quickCheck);
	}

	private JevQuickCheck jevQuickCheck(ProfileRangesDto profile, PathInput paths) {
		List<JevAnswerDto> answers = jevStateMapper.toAnswers(paths.measurement().answers());
		return new JevQuickCheck(profile, answers, PathRules.firstLessonChoices(paths), PathRules.interestNotes(paths));
	}

	private CategorizationDto categorization(CategorizationInput input, PathInput paths, JevResult fromJev) {
		CategorizationRequestDto request = input.request();
		Learner learner = learner(input, paths.picked());
		Measurement measurement = paths.measurement();
		Judgement judgement = fromJev.judgement()
			.orElseGet(() -> CategorizationRules.fallback(learner, measurement));
		Role role = CategorizationRules.cappedRole(judgement.role(), measurement);
		StoryPlan plan = PathRules.plan(PathRules.ledByFocus(paths, judgement.focusAreas()), judgement.firstLesson());
		return CategorizationDto.builder()
			.userId(input.userId())
			.consent(request.consent())
			.bankData(request.facts() != null)
			.role(role)
			.lifeStage(learner.lifeStage())
			.focusAreas(judgement.focusAreas())
			.gaps(gaps(learner, measurement, plan.area()))
			.lessonVariant(CategorizationRules.lessonVariant(role, learner.lifeStage()))
			.explanation(ExplanationRules.explanation(judgement, learner))
			.profile(input.quickCheckProfile().orElse(null))
			.mastery(FocusArea.byWire(measurement.mastery()))
			.answerCount(input.history().size())
			.startLesson(plannedStart(plan, paths.completed()))
			.readyForNext(plan.readyForNext())
			.pathStoryIds(plan.pathStoryIds())
			.sharedWithModel(sharedWithModel(input, fromJev.sent()))
			.source(fromJev.source())
			.model(judgement.model())
			.categorizedAt(input.at())
			.build();
	}

	private static Learner learner(CategorizationInput input, List<Story> picked) {
		String savingsCover = input.quickCheckProfile().map(ProfileRangesDto::savingsCover).orElse(null);
		return new Learner(input.onboarding(), input.request().facts(), picked, lifeStage(input), savingsCover);
	}

	private static LifeStage lifeStage(CategorizationInput input) {
		String answered = input.onboarding().lifeStage();
		if (answered != null) {
			return LifeStage.fromAnswer(answered);
		}
		return input.quickCheckProfile().map(ProfileRangesDto::ageBand).map(LifeStage::fromAgeBand).orElse(null);
	}

	private static List<GapDto> gaps(Learner learner, Measurement measurement, FocusArea startArea) {
		if (!measurement.ran()) {
			return GapRules.saidGaps(learner);
		}
		return GapRules.gapCards(GapRules.measuredGaps(measurement, learner.facts()), startArea);
	}

	// Covers the step calls too: they send the interests and ranges, only the final call the onboarding answers.
	private static SharedWithModelDto sharedWithModel(CategorizationInput input, boolean finalCallSent) {
		CategorizationRequestDto request = input.request();
		int stepCallsMade = request.stepCallsMade();
		if (!finalCallSent && stepCallsMade == 0) {
			return null;
		}
		OnboardingAnswersDto answers = null;
		if (finalCallSent) {
			answers = input.onboarding();
		}
		ProfileRangesDto profile = input.quickCheckProfile().orElse(null);
		if (stepCallsMade > 0) {
			profile = request.profile();
		}
		return new SharedWithModelDto(request.facts(), answers, input.onboarding().interests(), profile,
				input.history().size(), stepCallsMade);
	}

	private void save(CategorizationDto categorization) {
		ObjectNode row = json.valueToTree(categorization);
		// The key stays out of the row: startHere is read fresh on every GET.
		row.remove("startHere");
		// Saved only while onboarding is completed, so a reset during the Jev call is a 404.
		if (!dataService.saveIfOnboarded(categorization.userId(), json.writeValueAsString(row))) {
			throw new BusinessException(CategorizationErrorCode.FINISH_ONBOARDING_FIRST);
		}
	}

	private Optional<CategorizationDto> find(String userId) {
		return dataService.findData(userId)
			.flatMap(this::read)
			.map(stored -> stored.withStartHere(startHere(stored, OrderRules.lessons(checkQuestions.pool()),
					dataService.completedLessonIds(userId))));
	}

	private Optional<CategorizationDto> read(String data) {
		try {
			return Optional.of(json.readValue(data, CategorizationDto.class));
		}
		catch (JacksonException e) {
			log.warn("Stored categorisation no longer matches the contract ({}), treating it as missing",
					e.getClass().getSimpleName());
			return Optional.empty();
		}
	}

	private StartLessonDto plannedStart(StoryPlan plan, Set<String> completed) {
		Story start = plan.start();
		if (start == null) {
			return null;
		}
		return startLesson(start, plan.area(), completed);
	}

	// The first story of the path that still exists and has a lesson left.
	private StartLessonDto startHere(CategorizationDto categorization, List<CheckLesson> lessons,
			Set<String> completed) {
		List<Story> stories = checkQuestions.stories();
		return categorization.pathStoryIds().stream()
			.flatMap(id -> stories.stream().filter(story -> story.id().equals(id)))
			.filter(story -> PathRules.startLesson(story, completed).isPresent())
			.findFirst()
			.map(story -> startLesson(story, startHereArea(categorization, story, lessons), completed))
			.orElse(null);
	}

	private static FocusArea startHereArea(CategorizationDto categorization, Story story, List<CheckLesson> lessons) {
		StartLessonDto start = categorization.startLesson();
		if (start != null && story.id().equals(start.storyId())) {
			return start.area();
		}
		return PathRules.areaOf(story, lessons);
	}

	// Only for a story with a lesson left.
	private StartLessonDto startLesson(Story story, FocusArea area, Set<String> completed) {
		String lessonId = PathRules.startLesson(story, completed).orElseThrow();
		String title = content.findById(lessonId).orElseThrow().title();
		return startLessonMapper.toDto(lessonId, title, area, story);
	}

}
