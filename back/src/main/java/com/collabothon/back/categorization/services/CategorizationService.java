package com.collabothon.back.categorization.services;

import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.CategorizationRequestDto;
import com.collabothon.back.categorization.dto.ExplanationDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.GapDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.dto.SharedWithModelDto;
import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.Experience;
import com.collabothon.back.categorization.enums.ExplanationOutput;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.mappers.JevInterestMapper;
import com.collabothon.back.categorization.mappers.OnboardingAnswersMapper;
import com.collabothon.back.categorization.repositories.CategorizationRepository;
import com.collabothon.back.categorization.repositories.ProfileAnswersRepository;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

// No @Transactional: each statement commits on its own, so no DB connection is held during the Jev call.
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Slf4j
public class CategorizationService {

	private final ProfileAnswersRepository profiles;

	private final OnboardingAnswersMapper mapper;

	private final CategorizationRepository categorizations;

	private final JevClient jev;

	private final CheckQuestionService checkQuestions;

	private final JevInterestMapper jevInterestMapper;

	private final LessonContentRepository content;

	private final LessonCompletionRepository completions;

	private final JsonMapper json;

	private final Clock clock;

	public CategorizationDto categorize(String userId, CategorizationRequestDto request) {
		boolean consent = request.consent();
		FactsDto facts = request.facts();
		OnboardingAnswersDto answers = onboarding(userId);
		List<CheckQuestion> pool = checkQuestions.pool();
		// Without the ranges the Quick check did not run, so its fields are ignored, not checked against the pool.
		List<Answer> history = request.profile() == null ? List.of() : checkQuestions.resolve(request.history());
		Set<String> poolAreas = pool.stream().map(q -> q.area().wire()).collect(Collectors.toSet());
		if (request.profile() != null && !poolAreas.containsAll(request.mastery().keySet())) {
			throw new BusinessException(CategorizationErrorCode.MASTERY_ONLY_FOR_QUESTION_AREAS);
		}
		Instant now = Instant.now(clock);
		if (request.profile() == null && !request.useRules()) {
			Optional<CategorizationDto> recent = find(userId)
				.filter(c -> isRecentJevResult(c, answers, consent, facts, now));
			if (recent.isPresent()) {
				return recent.get();
			}
		}
		boolean ran = !history.isEmpty();
		ProfileRangesDto profile = ran ? request.profile() : null;
		List<Story> stories = stories();
		List<Story> interests = Story.picked(answers.interests(), stories);
		List<FocusArea> order = QuickCheckRules.areaOrder(FocusArea.fromInterests(answers.interests(), stories),
				ran ? profile.horizon() : null, pool);
		Map<FocusArea, Double> ruleMastery = QuickCheckRules.mastery(order, history);
		Map<FocusArea, Double> mastery = new LinkedHashMap<>();
		if (ran) {
			order.forEach(area -> {
				Double sent = request.mastery().get(area.wire());
				mastery.put(area, sent != null ? sent : ruleMastery.get(area));
			});
		}
		Set<String> completed = new HashSet<>(completions.findLessonIdsByUserId(userId));
		List<CheckLesson> lessons = QuickCheckRules.lessons(QuickCheckRules.pickedFirst(pool, interests));
		List<CheckLesson> interestLessons = QuickCheckRules.interestLessons(interests, lessons, mastery, history,
				completed);
		List<CheckLesson> choices = QuickCheckRules.firstLessonChoices(QuickCheckRules.pool(
				QuickCheckRules.candidates(lessons, stories, order, mastery, history, completed), history),
				interestLessons, history, completed);
		JevQuickCheck quickCheck = ran ? new JevQuickCheck(profile, history.stream().map(Answer::toJev).toList(),
				choices, QuickCheckRules.interestNotes(interestLessons, mastery, history)) : null;
		JevResult fromJev = request.useRules() ? JevResult.SKIPPED
				: jev.ask(answers, jevInterestMapper.toJev(interests), facts, quickCheck);

		LifeStage lifeStage = answers.lifeStage() == null && ran ? LifeStage.fromAgeBand(profile.ageBand())
				: LifeStage.fromAnswer(answers.lifeStage());
		String savingsCover = ran ? profile.savingsCover() : null;
		Role measured = ran && Experience.fromWire(answers.experience()) == null
				? QuickCheckRules.measuredRole(mastery, history) : null;
		Judgement j = fromJev.judgement()
			.orElseGet(() -> CategorizationRules.fallback(answers, facts, lifeStage, savingsCover, measured, stories));
		Role role = ran ? QuickCheckRules.cappedRole(j.role(), mastery, history) : j.role();
		// Without the Quick check nothing was measured, so the judged focus leads the path.
		List<FocusArea> pathOrder = ran ? order
				: Stream.concat(j.focusAreas().stream().filter(order::contains), order.stream()).distinct().toList();
		// Jev's lesson counts only when it is one of the lessons it was given to choose from.
		CheckLesson picked = choices.stream().filter(l -> l.id().equals(j.firstLesson())).findFirst().orElse(null);
		StoryPlan plan = QuickCheckRules.plan(stories,
				QuickCheckRules.candidates(lessons, stories, pathOrder, mastery, history, completed), picked, interests,
				pathOrder, mastery, history, completed);
		StartLessonDto startLesson = plan.start() == null ? null : startLesson(plan.start(), plan.area(), completed);
		FocusArea startArea = startLesson == null ? null : startLesson.area();
		List<GapDto> gaps = ran
				? QuickCheckRules.gapCards(gaps(order, history, facts), startArea)
				: CategorizationRules.saidGaps(answers, facts);
		SharedWithModelDto shared = fromJev.sent() || request.stepCallsMade() > 0
				? new SharedWithModelDto(facts, fromJev.sent() ? answers : null, answers.interests(),
						ran || request.stepCallsMade() > 0 ? request.profile() : null, history.size(),
						request.stepCallsMade())
				: null;

		List<FocusArea> focus = j.focusAreas();
		List<ExplanationDto> explanation = List.of(
				new ExplanationDto(ExplanationOutput.ROLE, j.roleProbabilities(),
						CategorizationRules.roleBecause(answers, facts)),
				new ExplanationDto(ExplanationOutput.FOCUS_AREAS, j.focusProbabilities(),
						CategorizationRules.focusBecause(focus, answers, facts, stories)));
		CategorizationDto c = new CategorizationDto(userId, consent, facts != null, role, lifeStage, focus, gaps,
				CategorizationRules.lessonVariant(role, lifeStage), explanation, profile,
				QuickCheckRules.byWire(mastery), history.size(), startLesson, plan.readyForNext(), plan.pathStoryIds(), null, shared,
				fromJev.judgement().isPresent() ? CategorizationSource.JEV : CategorizationSource.FALLBACK, j.model(),
				now);
		ObjectNode row = json.valueToTree(c);
		row.remove("startHere");
		// Saved only while onboarding is completed, so a reset during the Jev call is a 404.
		if (categorizations.saveIfOnboarded(userId, json.writeValueAsString(row)) == 0) {
			throw new BusinessException(CategorizationErrorCode.FINISH_ONBOARDING_FIRST);
		}
		return c.withStartHere(startHere(c, stories, lessons, completed));
	}

	private static Map<FocusArea, GapDirection> gaps(List<FocusArea> order, List<Answer> history, FactsDto facts) {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		for (FocusArea area : order) {
			QuickCheckRules.ruleGap(area, QuickCheckRules.inArea(history, area), facts)
				.ifPresent(direction -> gaps.put(area, direction));
		}
		return gaps;
	}

	/** The first story of the path that still exists and has a lesson left; read fresh, never stored. */
	private StartLessonDto startHere(CategorizationDto c, List<Story> stories, List<CheckLesson> lessons,
			Set<String> completed) {
		StartLessonDto start = c.startLesson();
		return c.pathStoryIds().stream()
			.flatMap(id -> stories.stream().filter(s -> s.id().equals(id)))
			.filter(s -> QuickCheckRules.startLesson(s, completed).isPresent())
			.findFirst()
			.map(s -> startLesson(s, start != null && s.id().equals(start.storyId()) ? start.area()
					: QuickCheckRules.areaOf(s, lessons), completed))
			.orElse(null);
	}

	/** Call only for a story with a lesson left. */
	private StartLessonDto startLesson(Story story, FocusArea area, Set<String> completed) {
		String lessonId = QuickCheckRules.startLesson(story, completed).orElseThrow();
		return new StartLessonDto(lessonId, content.lesson(lessonId).orElseThrow().path("title").asString(), area,
				story.id(), story.city());
	}

	List<Story> stories() {
		return content.stories().stream()
			.map(s -> new Story(s.path("id").asString(), s.path("category").asString(), s.path("city").asString(),
					s.path("topic").asString(), s.path("area").asString(), content.lessonIdsOf(s)))
			.toList();
	}

	/** Skipped onboarding counts; no finished onboarding is a 404. */
	public OnboardingAnswersDto onboarding(String userId) {
		return profiles.findAnswers(userId).map(mapper::toAnswers)
			.orElseThrow(() -> new BusinessException(CategorizationErrorCode.FINISH_ONBOARDING_FIRST));
	}

	public Optional<CategorizationDto> find(String userId) {
		return categorizations.findData(userId)
			.flatMap(this::read)
			.map(c -> c.withStartHere(startHere(c, stories(),
					QuickCheckRules.lessons(checkQuestions.pool()),
					new HashSet<>(completions.findLessonIdsByUserId(userId)))));
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

	private static boolean isRecentJevResult(CategorizationDto c, OnboardingAnswersDto answers, boolean consent,
			FactsDto facts, Instant now) {
		return c.source() == CategorizationSource.JEV && c.profile() == null && c.answerCount() == 0
				&& c.consent() == consent && c.sharedWithModel() != null
				&& answers.equals(c.sharedWithModel().answers()) && Objects.equals(facts, c.sharedWithModel().facts())
				&& c.categorizedAt().isAfter(now.minus(CategorizationConsts.RECATEGORIZE_AFTER));
	}

}
