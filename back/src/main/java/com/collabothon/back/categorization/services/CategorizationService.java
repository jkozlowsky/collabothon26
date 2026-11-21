package com.collabothon.back.categorization.services;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.CheckAnswerDto;
import com.collabothon.back.categorization.dto.CheckDto;
import com.collabothon.back.categorization.dto.ExplanationDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.JevCheckDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.SharedCheckDto;
import com.collabothon.back.categorization.dto.SharedWithModelDto;
import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.CheckResult;
import com.collabothon.back.categorization.enums.ExplanationOutput;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.mappers.CheckMapper;
import com.collabothon.back.categorization.mappers.JevCheckMapper;
import com.collabothon.back.categorization.mappers.OnboardingAnswersMapper;
import com.collabothon.back.categorization.mappers.SharedCheckMapper;
import com.collabothon.back.categorization.mappers.StartLessonMapper;
import com.collabothon.back.categorization.repositories.ProfileAnswersRepository;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;
import com.collabothon.back.common.exceptions.NotFoundException;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

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

	private final JevProperties jevProperties;

	private final CheckQuestionService checkQuestions;

	private final JevCheckMapper jevCheckMapper;

	private final CheckMapper checkMapper;

	private final SharedCheckMapper sharedCheckMapper;

	private final StartLessonMapper startLessonMapper;

	private final JsonMapper json;

	private final Clock clock;

	public CategorizationDto categorize(String userId, boolean consent, FactsDto facts,
			List<CheckAnswerDto> checkAnswers) {
		OnboardingAnswersDto answers = profiles.findAnswers(userId)
			.map(mapper::toAnswers)
			.orElseThrow(() -> new NotFoundException(NO_PROFILE));
		Instant now = Instant.now(clock);
		// Without a judge the answers cannot be used, so they are dropped before any validation.
		List<CheckAnswerDto> submitted = checkAnswers == null || !jevProperties.callsJev() ? List.of() : checkAnswers;
		List<CheckQuestionProjection> picked = submitted.isEmpty() ? List.of() : checkQuestions.pick(submitted);
		if (submitted.isEmpty()) {
			Optional<CategorizationDto> recent = find(userId)
				.filter(c -> isRecentJevResult(c, answers, consent, facts, now));
			if (recent.isPresent()) {
				return recent.get();
			}
		}
		String boundary = UUID.randomUUID().toString();
		List<JevCheckDto> toJudge = new ArrayList<>();
		List<SharedCheckDto> sharedChecks = new ArrayList<>();
		for (int i = 0; i < picked.size(); i++) {
			CheckQuestionProjection q = picked.get(i);
			String text = submitted.get(i).text();
			sharedChecks.add(sharedCheckMapper.toShared(q, text != null));
			if (text != null) {
				toJudge.add(jevCheckMapper.toJevCheck(q, boundary + " " + text.strip() + " " + boundary));
			}
		}
		JevResult fromJev = jev.ask(answers, facts, toJudge, boundary);
		Judgement j = fromJev.judgement().orElseGet(() -> CategorizationRules.fallback(answers, facts));
		SharedWithModelDto shared = fromJev.sent() ? new SharedWithModelDto(facts, answers, sharedChecks) : null;
		List<CheckDto> checks = new ArrayList<>();
		for (int i = 0; i < picked.size(); i++) {
			CheckQuestionProjection q = picked.get(i);
			CheckResult result = submitted.get(i).text() == null ? CheckResult.NOT_YET : j.checks().get(q.id());
			if (result != null) {
				checks.add(checkMapper.toCheck(q, result));
			}
		}

		LifeStage lifeStage = LifeStage.fromAnswer(answers.lifeStage());
		List<FocusArea> focus = CategorizationRules.focusWithChecks(j.focusAreas(), checks);
		List<ExplanationDto> explanation = List.of(
				new ExplanationDto(ExplanationOutput.ROLE, j.roleProbabilities(),
						CategorizationRules.roleBecause(answers, facts)),
				new ExplanationDto(ExplanationOutput.FOCUS_AREAS, j.focusProbabilities(),
						CategorizationRules.focusBecause(focus, answers, facts)));

		CategorizationDto c = new CategorizationDto(userId, consent, facts != null, j.role(), lifeStage, focus,
				CategorizationRules.confidenceGaps(answers, facts, checks),
				CategorizationRules.lessonVariant(j.role(), lifeStage), explanation, checks,
				checkQuestions.startLesson(checks, focus, picked).map(startLessonMapper::toStartLesson).orElse(null),
				shared,
				fromJev.judgement().isPresent() ? CategorizationSource.JEV : CategorizationSource.FALLBACK, j.model(),
				now);
		// Inserting only while onboarding is completed turns a reset during the Jev call into a 404.
		int saved = jdbc.sql("""
				INSERT INTO categorization (user_id, data)
				SELECT user_id, ?::jsonb FROM user_profile WHERE user_id = ? AND onboarding_completed
				ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data""")
			.params(json.writeValueAsString(c), userId)
			.update();
		if (saved == 0) {
			throw new NotFoundException(NO_PROFILE);
		}
		return c;
	}

	public Optional<CategorizationDto> find(String userId) {
		return jdbc.sql("SELECT data FROM categorization WHERE user_id = ?")
			.param(userId)
			.query(String.class)
			.optional()
			.flatMap(this::read);
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
