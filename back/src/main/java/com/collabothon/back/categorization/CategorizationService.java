package com.collabothon.back.categorization;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.Categorization.Explanation;
import com.collabothon.back.categorization.Categorization.LifeStage;
import com.collabothon.back.categorization.Categorization.OnboardingAnswers;
import com.collabothon.back.categorization.Categorization.Output;
import com.collabothon.back.categorization.Categorization.SharedWithModel;
import com.collabothon.back.categorization.Categorization.Source;
import com.collabothon.back.categorization.Rules.Judgement;
import com.collabothon.back.common.NotFoundException;

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

	/** A repeated POST with the same answers, consent and facts inside this window reuses the Jev result. */
	static final Duration RECATEGORIZE_AFTER = Duration.ofMinutes(5);

	private static final String NO_PROFILE = "Finish onboarding first";

	private final ProfileAnswersRepository profiles;

	private final OnboardingAnswersMapper mapper;

	private final JdbcClient jdbc;

	private final JevClient jev;

	private final JsonMapper json;

	private final Clock clock;

	public Categorization categorize(String userId, boolean consent, Facts facts) {
		OnboardingAnswers answers = profiles.findAnswers(userId)
			.map(mapper::toAnswers)
			.orElseThrow(() -> new NotFoundException(NO_PROFILE));
		Instant now = Instant.now(clock);
		Optional<Categorization> recent = find(userId).filter(c -> isRecentJevResult(c, answers, consent, facts, now));
		if (recent.isPresent()) {
			return recent.get();
		}
		JevClient.Result fromJev = jev.ask(answers, facts);
		Judgement j = fromJev.judgement().orElseGet(() -> Rules.fallback(answers, facts));
		SharedWithModel shared = fromJev.sent() ? new SharedWithModel(facts, answers) : null;

		LifeStage lifeStage = LifeStage.fromAnswer(answers.lifeStage());
		List<Explanation> explanation = List.of(
				new Explanation(Output.ROLE, j.roleProbabilities(), Rules.roleBecause(answers, facts)),
				new Explanation(Output.FOCUS_AREAS, j.focusProbabilities(),
						Rules.focusBecause(j.focusAreas(), answers, facts)));

		Categorization c = new Categorization(userId, consent, facts != null, j.role(), lifeStage, j.focusAreas(),
				Rules.confidenceGaps(answers, facts), Rules.lessonVariant(j.role(), lifeStage), explanation, shared,
				fromJev.judgement().isPresent() ? Source.JEV : Source.FALLBACK, j.model(), now);
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

	public Optional<Categorization> find(String userId) {
		return jdbc.sql("SELECT data FROM categorization WHERE user_id = ?")
			.param(userId)
			.query(String.class)
			.optional()
			.flatMap(this::read);
	}

	private Optional<Categorization> read(String data) {
		try {
			return Optional.of(json.readValue(data, Categorization.class));
		}
		catch (JacksonException e) {
			log.warn("Stored categorisation no longer matches the contract ({}), treating it as missing",
					e.getClass().getSimpleName());
			return Optional.empty();
		}
	}

	private static boolean isRecentJevResult(Categorization c, OnboardingAnswers answers, boolean consent,
			Facts facts, Instant now) {
		return c.source() == Source.JEV && c.consent() == consent && c.sharedWithModel() != null
				&& answers.equals(c.sharedWithModel().answers()) && Objects.equals(facts, c.sharedWithModel().facts())
				&& c.categorizedAt().isAfter(now.minus(RECATEGORIZE_AFTER));
	}

}
