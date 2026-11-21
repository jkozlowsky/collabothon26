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
import java.util.stream.Stream;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.CategorizationRequestDto;
import com.collabothon.back.categorization.dto.ConfidenceGapDto;
import com.collabothon.back.categorization.dto.ExplanationDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.dto.SharedWithModelDto;
import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.ExplanationOutput;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.mappers.BankLessonMapper;
import com.collabothon.back.categorization.mappers.JevAnswerMapper;
import com.collabothon.back.categorization.mappers.OnboardingAnswersMapper;
import com.collabothon.back.categorization.mappers.StartLessonMapper;
import com.collabothon.back.categorization.repositories.ProfileAnswersRepository;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;
import com.collabothon.back.common.exceptions.BadRequestException;
import com.collabothon.back.common.exceptions.NotFoundException;
import com.collabothon.back.lesson.LessonContent;
import com.collabothon.back.lesson.LessonProgress;

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

	private static final String NO_PROFILE = "Finish onboarding first";

	private final ProfileAnswersRepository profiles;

	private final OnboardingAnswersMapper mapper;

	private final JdbcClient jdbc;

	private final JevClient jev;

	private final CheckQuestionService checkQuestions;

	private final StartLessonMapper startLessonMapper;

	private final BankLessonMapper bankLessonMapper;

	private final JevAnswerMapper jevAnswerMapper;

	private final LessonContent content;

	private final LessonProgress progress;

	private final JsonMapper json;

	private final Clock clock;

	public CategorizationDto categorize(String userId, CategorizationRequestDto request) {
		boolean consent = request.consent();
		FactsDto facts = request.facts();
		OnboardingAnswersDto answers = onboarding(userId);
		List<CheckQuestionProjection> bank = checkQuestions.bank();
		// Without the ranges the Quick check did not run, so its fields are ignored, not history against the bank.
		List<Answer> history = request.profile() == null ? List.of() : checkQuestions.resolve(request.history(), bank);
		Set<String> bankAreas = bank.stream().map(q -> q.area().wire()).collect(Collectors.toSet());
		if (request.profile() != null && !bankAreas.containsAll(request.mastery().keySet())) {
			throw new BadRequestException("Mastery is only kept for areas with questions");
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
		List<FocusArea> order = QuickCheckRules.areaOrder(answers.goals(), ran ? profile.horizon() : null, bank);
		Map<FocusArea, Double> ruleMastery = QuickCheckRules.mastery(order, history);
		Map<FocusArea, Double> mastery = new LinkedHashMap<>();
		if (ran) {
			order.forEach(area -> {
				Double sent = request.mastery().get(area.wire());
				mastery.put(area, sent != null ? sent : ruleMastery.get(area));
			});
		}
		Set<String> completed = progress.completed(userId);
		List<Story> stories = stories();
		List<BankLesson> lessons = QuickCheckRules.lessons(bank, bankLessonMapper::toLesson);
		List<Story> pool = QuickCheckRules.stories(QuickCheckRules.pool(
				QuickCheckRules.candidates(lessons, stories, order, mastery, history, completed), history), stories);
		List<FocusArea> gapAreas = QuickCheckRules.chipAreas(order, history);
		Map<String, String> storyChoice = new LinkedHashMap<>();
		if (pool.size() >= JevConsts.MIN_CHOICE_LABELS) {
			pool.forEach(story -> storyChoice.put(story.id(), story.topic()));
		}
		JevQuickCheck quickCheck = ran ? new JevQuickCheck(profile, answers.goals(),
				history.stream().map(jevAnswerMapper::toJev).toList(), gapAreas, storyChoice) : null;
		JevResult fromJev = request.useRules() ? JevResult.SKIPPED : jev.ask(answers, facts, quickCheck);

		LifeStage lifeStage = answers.lifeStage() == null && ran ? LifeStage.fromAgeBand(profile.ageBand())
				: LifeStage.fromAnswer(answers.lifeStage());
		String savingsCover = ran ? profile.savingsCover() : null;
		Judgement j = fromJev.judgement()
			.orElseGet(() -> CategorizationRules.fallback(answers, facts, lifeStage, savingsCover));
		// Without the Quick check nothing was measured, so the judged focus leads the path.
		List<FocusArea> pathOrder = ran ? order
				: Stream.concat(j.focusAreas().stream().filter(order::contains), order.stream()).distinct().toList();
		Story picked = pool.stream().filter(story -> story.id().equals(j.firstStory())).findFirst().orElse(null);
		StoryPlan plan = QuickCheckRules.plan(stories,
				QuickCheckRules.candidates(lessons, stories, pathOrder, mastery, history, completed), picked, pathOrder,
				mastery, history, completed);
		StartLessonDto startLesson = plan.start() == null ? null : startLesson(plan.start(), lessons, completed);
		FocusArea startArea = startLesson == null ? null : startLesson.area();
		List<ConfidenceGapDto> gaps = ran
				? QuickCheckRules.gapCards(gaps(order, history, mastery, fromJev.judgement()), history, startArea)
				: CategorizationRules.confidenceGaps(answers, facts);
		SharedWithModelDto shared = fromJev.sent() || request.stepCallsMade() > 0
				? new SharedWithModelDto(facts, fromJev.sent() ? answers : null, answers.goals(),
						ran || request.stepCallsMade() > 0 ? request.profile() : null, history.size(),
						request.stepCallsMade())
				: null;

		List<FocusArea> focus = j.focusAreas();
		List<ExplanationDto> explanation = List.of(
				new ExplanationDto(ExplanationOutput.ROLE, j.roleProbabilities(),
						CategorizationRules.roleBecause(answers, facts)),
				new ExplanationDto(ExplanationOutput.FOCUS_AREAS, j.focusProbabilities(),
						CategorizationRules.focusBecause(focus, answers, facts)));
		CategorizationDto c = new CategorizationDto(userId, consent, facts != null, j.role(), lifeStage, focus, gaps,
				CategorizationRules.lessonVariant(j.role(), lifeStage), explanation, profile,
				QuickCheckRules.byWire(mastery),
				ran ? QuickCheckRules.byWire(QuickCheckRules.confidence(order, history)) : Map.of(),
				history.size(), startLesson, plan.readyForNext(), plan.pathStoryIds(), null, shared,
				fromJev.judgement().isPresent() ? CategorizationSource.JEV : CategorizationSource.FALLBACK, j.model(),
				now);
		ObjectNode row = json.valueToTree(c);
		row.remove("startHere");
		// Inserting only while onboarding is completed turns a reset during the Jev call into a 404.
		int saved = jdbc.sql("""
				INSERT INTO categorization (user_id, data)
				SELECT user_id, ?::jsonb FROM user_profile WHERE user_id = ? AND onboarding_completed
				ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data""")
			.params(json.writeValueAsString(row), userId)
			.update();
		if (saved == 0) {
			throw new NotFoundException(NO_PROFILE);
		}
		return c.withStartHere(startHere(c.pathStoryIds(), stories, lessons, completed));
	}

	/** Jev's labels where its call answered, each history against the chips; the rule otherwise. In area order. */
	private static Map<FocusArea, GapDirection> gaps(List<FocusArea> order, List<Answer> history,
			Map<FocusArea, Double> mastery, Optional<Judgement> fromJev) {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		for (FocusArea area : order) {
			List<Answer> inArea = QuickCheckRules.inArea(history, area);
			Optional<GapDirection> gap = fromJev.isPresent()
					? Optional.ofNullable(fromJev.get().gaps().get(area))
						.flatMap(label -> QuickCheckRules.checkedJevGap(label, inArea))
					: QuickCheckRules.ruleGap(inArea, mastery.get(area));
			gap.ifPresent(direction -> gaps.put(area, direction));
		}
		return gaps;
	}

	/** The first story of the path that still exists and has a lesson left; read fresh, never stored. */
	private StartLessonDto startHere(List<String> path, List<Story> stories, List<BankLesson> lessons,
			Set<String> completed) {
		return path.stream()
			.flatMap(id -> stories.stream().filter(s -> s.id().equals(id)))
			.filter(s -> QuickCheckRules.startLesson(s, completed).isPresent())
			.findFirst()
			.map(s -> startLesson(s, lessons, completed))
			.orElse(null);
	}

	/** Call only for a story with a lesson left. */
	private StartLessonDto startLesson(Story story, List<BankLesson> lessons, Set<String> completed) {
		String lessonId = QuickCheckRules.startLesson(story, completed).orElseThrow();
		return startLessonMapper.toStartLesson(story, lessonId,
				content.lesson(lessonId).orElseThrow().path("title").asString(),
				QuickCheckRules.area(story, lessonId, lessons));
	}

	private List<Story> stories() {
		return content.stories().stream()
			.map(s -> new Story(s.path("id").asString(), s.path("city").asString(), s.path("topic").asString(),
					content.lessonIdsOf(s)))
			.toList();
	}

	/** Skipped onboarding counts; no finished onboarding is a 404. */
	public OnboardingAnswersDto onboarding(String userId) {
		return profiles.findAnswers(userId).map(mapper::toAnswers).orElseThrow(() -> new NotFoundException(NO_PROFILE));
	}

	public Optional<CategorizationDto> find(String userId) {
		return jdbc.sql("SELECT data FROM categorization WHERE user_id = ?")
			.param(userId)
			.query(String.class)
			.optional()
			.flatMap(this::read)
			.map(c -> c.withStartHere(startHere(c.pathStoryIds(), stories(),
					QuickCheckRules.lessons(checkQuestions.bank(), bankLessonMapper::toLesson),
					progress.completed(userId))));
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
