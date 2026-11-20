package com.collabothon.back.categorization;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.Rules.Judgement;
import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.ExplanationDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.SharedWithModelDto;
import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.ExplanationOutput;
import com.collabothon.back.categorization.enums.LifeStage;
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

	private final JsonMapper json;

	private final Clock clock;

	public CategorizationDto categorize(String userId, boolean consent, FactsDto facts) {
		OnboardingAnswersDto answers = profiles.findAnswers(userId)
			.map(mapper::toAnswers)
			.orElseThrow(() -> new NotFoundException(NO_PROFILE));
		Instant now = Instant.now(clock);
		Optional<CategorizationDto> recent = find(userId)
			.filter(c -> isRecentJevResult(c, answers, consent, facts, now));
		if (recent.isPresent()) {
			return recent.get();
		}
		JevClient.Result fromJev = jev.ask(answers, facts);
		Judgement j = fromJev.judgement().orElseGet(() -> Rules.fallback(answers, facts));
		SharedWithModelDto shared = fromJev.sent() ? new SharedWithModelDto(facts, answers) : null;

		LifeStage lifeStage = LifeStage.fromAnswer(answers.lifeStage());
		List<ExplanationDto> explanation = List.of(
				new ExplanationDto(ExplanationOutput.ROLE, j.roleProbabilities(), Rules.roleBecause(answers, facts)),
				new ExplanationDto(ExplanationOutput.FOCUS_AREAS, j.focusProbabilities(),
						Rules.focusBecause(j.focusAreas(), answers, facts)));

		CategorizationDto c = new CategorizationDto(userId, consent, facts != null, j.role(), lifeStage, j.focusAreas(),
				Rules.confidenceGaps(answers, facts), Rules.lessonVariant(j.role(), lifeStage), explanation, shared,
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
