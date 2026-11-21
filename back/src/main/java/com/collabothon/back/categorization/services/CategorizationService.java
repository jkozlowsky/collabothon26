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
import com.collabothon.back.categorization.mappers.JevAnswerMapper;
import com.collabothon.back.categorization.mappers.OnboardingAnswersMapper;
import com.collabothon.back.categorization.mappers.StartLessonMapper;
import com.collabothon.back.categorization.repositories.CompletedLessonRepository;
import com.collabothon.back.categorization.repositories.ProfileAnswersRepository;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;
import com.collabothon.back.common.exceptions.BadRequestException;
import com.collabothon.back.common.exceptions.NotFoundException;

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

	private final JevAnswerMapper jevAnswerMapper;

	private final CompletedLessonRepository completedLessons;

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
		Set<Long> completed = completedLessons.findLessonIds(userId);
		List<BankLesson> lessons = QuickCheckRules.lessons(bank);
		List<BankLesson> pool = QuickCheckRules.pool(
				QuickCheckRules.candidates(lessons, order, mastery, history, completed), history);
		List<FocusArea> gapAreas = QuickCheckRules.chipAreas(order, history);
		Map<Long, String> lessonChoice = new LinkedHashMap<>();
		if (pool.size() >= JevConsts.MIN_CHOICE_LABELS) {
			pool.forEach(l -> lessonChoice.put(l.id(), l.summary()));
		}
		JevQuickCheck quickCheck = ran ? new JevQuickCheck(profile, answers.goals(),
				history.stream().map(jevAnswerMapper::toJev).toList(), gapAreas, lessonChoice) : null;
		JevResult fromJev = request.useRules() ? JevResult.SKIPPED : jev.ask(answers, facts, quickCheck);

		LifeStage lifeStage = answers.lifeStage() == null && ran ? LifeStage.fromAgeBand(profile.ageBand())
				: LifeStage.fromAnswer(answers.lifeStage());
		String savingsCover = ran ? profile.savingsCover() : null;
		Judgement j = fromJev.judgement()
			.orElseGet(() -> CategorizationRules.fallback(answers, facts, lifeStage, savingsCover));
		// Without the Quick check nothing was measured, so the judged focus leads the path.
		List<FocusArea> pathOrder = ran ? order
				: Stream.concat(j.focusAreas().stream().filter(order::contains), order.stream()).distinct().toList();
		BankLesson picked = pool.stream().filter(l -> l.id().equals(j.firstLesson())).findFirst().orElse(null);
		LessonPlan plan = QuickCheckRules.plan(lessons,
				QuickCheckRules.candidates(lessons, pathOrder, mastery, history, completed), picked, pathOrder, mastery,
				history, completed);
		FocusArea startArea = plan.start() == null ? null : plan.start().area();
		List<ConfidenceGapDto> gaps = ran
				? QuickCheckRules.gapCards(gaps(order, history, mastery, fromJev.judgement()), history, startArea)
				: CategorizationRules.confidenceGaps(answers, facts);
		SharedWithModelDto shared = fromJev.sent() || request.stepCallsMade() > 0
				? new SharedWithModelDto(facts, fromJev.sent() ? answers : null, profile, history.size(),
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
				history.size(), plan.start() == null ? null : startLessonMapper.toStartLesson(plan.start()),
				plan.readyForNext(), plan.pathLessonIds(), null, shared,
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
		return c.withStartHere(startHere(c.pathLessonIds(), lessons, completed));
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

	/** The first lesson of the path that still exists and is not completed; read fresh, never stored. */
	private StartLessonDto startHere(List<Long> path, List<BankLesson> lessons, Set<Long> completed) {
		return path.stream()
			.filter(id -> !completed.contains(id))
			.flatMap(id -> lessons.stream().filter(l -> l.id().equals(id)))
			.findFirst()
			.map(startLessonMapper::toStartLesson)
			.orElse(null);
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
			.map(c -> c.withStartHere(startHere(c.pathLessonIds(), QuickCheckRules.lessons(checkQuestions.bank()),
					completedLessons.findLessonIds(userId))));
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
		return c.source() == CategorizationSource.JEV && c.consent() == consent && c.sharedWithModel() != null
				&& answers.equals(c.sharedWithModel().answers()) && Objects.equals(facts, c.sharedWithModel().facts())
				&& c.categorizedAt().isAfter(now.minus(CategorizationConsts.RECATEGORIZE_AFTER));
	}

}
