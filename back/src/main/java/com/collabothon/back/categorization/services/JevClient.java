package com.collabothon.back.categorization.services;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import java.net.ConnectException;
import java.net.UnknownHostException;
import java.net.http.HttpConnectTimeoutException;
import java.time.Duration;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import javax.net.ssl.SSLHandshakeException;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.JevRequestDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.enums.WireNames;

import jakarta.annotation.PreDestroy;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@EnableConfigurationProperties(JevProperties.class)
@Slf4j
public class JevClient {

	private static final Pattern MODEL_ID = Pattern.compile(JevConsts.MODEL_ID_PATTERN);

	// Anywhere in the cause chain, these mean the connection was never up, so the body cannot have left.
	private static final List<Class<? extends Throwable>> NOT_SENT = List.of(ConnectException.class,
			UnknownHostException.class, HttpConnectTimeoutException.class, SSLHandshakeException.class);

	// Verbatim from docs/specs/F1-profiling.md ("Jev call").
	private static final String QUESTIONS = """
			{
			  "role": {"type": "choice",
			    "instructions": "Based on how this person describes their money habits (from not saving yet to planning ahead) and, when given, facts about their accounts, which learner level fits best?",
			    "criteria": {
			      "novice": "Does not save yet or saves only now and then, and shows few healthy money habits such as regular saving or a cash buffer.",
			      "intermediate": "Saves regularly or has a safety net, but does not invest yet or does not act on it consistently.",
			      "advanced": "Saves and invests, or plans their finances ahead; habits such as regular saving support this."}},
			  "focus_saving":     {"type": "noul", "instructions": "Would this person benefit most from learning about building an emergency fund and saving right now?"},
			  "focus_debt":       {"type": "noul", "instructions": "Would this person benefit most from learning about avoiding overdrafts and expensive debt right now?"},
			  "focus_investing":  {"type": "noul", "instructions": "Would this person benefit most from learning how investing works, for example funds and ETFs, right now?"},
			  "focus_risk":       {"type": "noul", "instructions": "Would this person benefit most from learning about risk, diversification and protection right now?"},
			  "focus_retirement": {"type": "noul", "instructions": "Would this person benefit most from learning about planning for retirement and the family's future right now?"}
			}
			""";

	// Verbatim from docs/specs/F1b-quick-check.md ("Jev step call"); `next.criteria` is filled per request.
	private static final String STEP_QUESTIONS = """
			{
			  "mastery_saving":     {"type": "noul", "instructions": "Do this person's answers about saving, emergency funds and inflation show that they understand these ideas well?"},
			  "mastery_investing":  {"type": "noul", "instructions": "Do this person's answers about investing, compound interest and market ups and downs show that they understand these ideas well?"},
			  "next": {"type": "choice",
			    "instructions": "Which of these questions would show best what this person still needs to learn, given their answers so far, how sure they felt and when they might need their money?",
			    "criteria": {}},
			  "enough": {"type": "noul", "instructions": "Do the answers so far show clearly enough what this person already understands and what they should learn first?"}
			}
			""";

	// Verbatim from docs/specs/F1b-quick-check.md ("Jev final call"); one gap question per area, criteria per request.
	private static final String FINAL_QUESTIONS = """
			{
			  "gap_<area>": {"type": "choice",
			    "instructions": "In this area, how does how sure this person felt compare with how well they answered?",
			    "criteria": {
			      "under": "Their answers in this area are mostly right, yet they said they were guessing or only fairly sure.",
			      "over": "They said they were sure, yet their answers in this area show gaps.",
			      "aligned": "How sure they felt roughly matches how well they answered."}},
			  "first_lesson": {"type": "choice",
			    "instructions": "Which lesson should this person start with, given which ideas their answers show they have not mastered yet?",
			    "criteria": {}}
			}
			""";

	private final RestClient rest;

	private final JevProperties properties;

	private final ObjectNode questions;

	private final ObjectNode stepQuestions;

	private final ObjectNode finalQuestions;

	// ponytail: the 3 s step limit is a Future timeout, not a second request factory: Boot binds MockRestServiceServer
	// to the one injected builder's factory, so a second factory would send test calls to the real API.
	private final ExecutorService stepCalls = Executors.newVirtualThreadPerTaskExecutor();

	@PreDestroy
	void close() {
		stepCalls.close();
	}

	JevClient(RestClient.Builder builder, JsonMapper json, JevProperties properties) {
		if (!properties.apiKey().isEmpty()) {
			builder.defaultHeader(AUTHORIZATION, "Bearer " + properties.apiKey());
		}
		this.rest = builder.baseUrl(properties.baseUrl()).build();
		this.properties = properties;
		this.questions = (ObjectNode) json.readTree(QUESTIONS);
		this.stepQuestions = (ObjectNode) json.readTree(STEP_QUESTIONS);
		this.finalQuestions = (ObjectNode) json.readTree(FINAL_QUESTIONS);
	}

	public Optional<StepJudgement> step(ProfileRangesDto profile, List<String> goals, FactsDto facts,
			List<JevAnswerDto> answers, List<FocusArea> answeredAreas, Map<String, String> unasked) {
		Map<String, Object> state = new LinkedHashMap<>();
		state.put("profile", profile);
		state.put("goals", goals);
		if (facts != null) {
			state.put("facts", facts);
		}
		state.put("answers", answers);
		ObjectNode asked = stepQuestions.objectNode();
		answeredAreas.stream()
			.map(area -> "mastery_" + area.wire())
			// ponytail: an area gets a mastery question only once its text is in STEP_QUESTIONS (spec: areas without lessons).
			.filter(stepQuestions::has)
			.forEach(key -> asked.set(key, stepQuestions.get(key).deepCopy()));
		if (unasked.size() >= JevConsts.MIN_CHOICE_LABELS) {
			ObjectNode next = (ObjectNode) stepQuestions.get("next").deepCopy();
			unasked.forEach(next.putObject("criteria")::put);
			asked.set("next", next);
		}
		asked.set("enough", stepQuestions.get("enough").deepCopy());
		JevRequestDto body = new JevRequestDto(properties.model(), state, asked);
		long start = System.nanoTime();
		Future<JsonNode> call = stepCalls.submit(() -> post(body));
		try {
			JsonNode response = call.get(JevConsts.STEP_READ_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
			Optional<StepJudgement> judgement = parseStep(response, asked, unasked.keySet(),
					Duration.ofNanos(System.nanoTime() - start));
			if (judgement.isEmpty()) {
				log.warn("Jev step answer broke the contract, using the rule");
			}
			return judgement;
		}
		catch (TimeoutException e) {
			call.cancel(true);
			log.warn("Jev step call took longer than {}, using the rule", JevConsts.STEP_READ_TIMEOUT);
			return Optional.empty();
		}
		catch (ExecutionException e) {
			log.warn("Jev step call failed ({}), using the rule",
					NestedExceptionUtils.getMostSpecificCause(e).getClass().getSimpleName());
			return Optional.empty();
		}
		catch (InterruptedException e) {
			call.cancel(true);
			Thread.currentThread().interrupt();
			return Optional.empty();
		}
	}

	private static Optional<StepJudgement> parseStep(JsonNode response, ObjectNode asked, Set<String> unasked,
			Duration elapsed) {
		if (response == null) {
			return Optional.empty();
		}
		JsonNode answers = response.path("answers");
		Map<FocusArea, Double> mastery = new EnumMap<>(FocusArea.class);
		for (FocusArea area : FocusArea.values()) {
			String key = "mastery_" + area.wire();
			if (asked.has(key)) {
				Double p = probability(answers.path(key).path("noul"));
				if (p == null) {
					return Optional.empty();
				}
				mastery.put(area, p);
			}
		}
		Double enough = probability(answers.path("enough").path("noul"));
		String next = null;
		if (asked.has("next")) {
			Map<String, String> labels = new LinkedHashMap<>();
			unasked.forEach(id -> labels.put(id, id));
			JevChoice<String> choice = choice(answers.path("next"), labels);
			if (choice == null) {
				return Optional.empty();
			}
			next = choice.value();
		}
		return enough == null ? Optional.empty() : Optional.of(new StepJudgement(mastery, next, enough, elapsed));
	}

	private JsonNode post(JevRequestDto body) {
		return rest.post()
			.uri(JevConsts.SYSTEM_ONE_PATH)
			.contentType(MediaType.APPLICATION_JSON)
			.body(body)
			.retrieve()
			// Redirects are not followed, so a 3xx would otherwise be parsed like a 200.
			.onStatus(HttpStatusCode::is3xxRedirection, (request, redirect) -> {
				throw new RestClientException("Jev redirected");
			})
			.body(JsonNode.class);
	}

	/** {@code quickCheck} null = the Quick check did not run, so the request is F1's exactly. */
	public JevResult ask(OnboardingAnswersDto answers, FactsDto facts, JevQuickCheck quickCheck) {
		if (!properties.callsJev()) {
			return JevResult.SKIPPED;
		}
		Map<String, Object> state = new LinkedHashMap<>();
		state.put("answers", answers);
		if (facts != null) {
			state.put("facts", facts);
		}
		ObjectNode asked = questions;
		if (quickCheck != null) {
			state.put("profile", quickCheck.profile());
			state.put("goals", quickCheck.goals());
			// F1 already names the onboarding answers `answers`, so the knowledge answers get their own key.
			state.put("checkAnswers", quickCheck.answers());
			asked = questions.deepCopy();
			for (FocusArea area : quickCheck.gapAreas()) {
				asked.set(gapKey(area), finalQuestions.get("gap_<area>").deepCopy());
			}
			if (!quickCheck.lessons().isEmpty()) {
				ObjectNode firstLesson = (ObjectNode) finalQuestions.get("first_lesson").deepCopy();
				ObjectNode criteria = firstLesson.putObject("criteria");
				quickCheck.lessons().forEach((id, summary) -> criteria.put(lessonLabel(id), summary));
				asked.set("first_lesson", firstLesson);
			}
		}
		try {
			JsonNode response = post(new JevRequestDto(properties.model(), state, asked));
			Optional<Judgement> judgement = parse(response, quickCheck);
			if (judgement.isEmpty()) {
				log.warn("Jev answer broke the contract, using the rules fallback");
			}
			return new JevResult(judgement, true);
		}
		catch (IllegalArgumentException e) {
			// JevProperties rejects a bad URL or key at startup, so this comes from the response, e.g. a broken
			// Content-Type; counting it as sent over-reports rather than hides what was shared.
			log.warn("Jev call failed ({}), using the rules fallback", e.getClass().getSimpleName());
			return new JevResult(Optional.empty(), true);
		}
		catch (RestClientException e) {
			log.warn("Jev call failed ({}), using the rules fallback",
					NestedExceptionUtils.getMostSpecificCause(e).getClass().getSimpleName());
			return new JevResult(Optional.empty(), !connectionFailed(e));
		}
	}

	private static boolean connectionFailed(Throwable e) {
		return Stream.iterate(e, Objects::nonNull, Throwable::getCause)
			.anyMatch(cause -> NOT_SENT.stream().anyMatch(type -> type.isInstance(cause)));
	}

	private static String gapKey(FocusArea area) {
		return "gap_" + area.wire();
	}

	private static String lessonLabel(Long lessonId) {
		return "lesson_" + lessonId;
	}

	private static Optional<Judgement> parse(JsonNode response, JevQuickCheck quickCheck) {
		if (response == null) {
			return Optional.empty();
		}
		JsonNode answers = response.path("answers");
		JevChoice<Role> role = choice(answers.path("role"), Role.values());
		Map<FocusArea, Double> noul = new EnumMap<>(FocusArea.class);
		Map<String, Double> focus = new LinkedHashMap<>();
		for (FocusArea area : FocusArea.values()) {
			Double p = probability(answers.path(area.jevQuestion()).path("noul"));
			if (p == null) {
				return Optional.empty();
			}
			noul.put(area, p);
			focus.put(area.wire(), p);
		}
		if (role == null) {
			return Optional.empty();
		}
		Map<FocusArea, GapDirection> gaps = new EnumMap<>(FocusArea.class);
		Long firstLesson = null;
		if (quickCheck != null) {
			for (FocusArea area : quickCheck.gapAreas()) {
				JevChoice<GapDirection> gap = choice(answers.path(gapKey(area)), GapDirection.values());
				if (gap == null) {
					return Optional.empty();
				}
				gaps.put(area, gap.value());
			}
			if (!quickCheck.lessons().isEmpty()) {
				Map<String, Long> byLabel = new LinkedHashMap<>();
				quickCheck.lessons().keySet().forEach(id -> byLabel.put(lessonLabel(id), id));
				JevChoice<Long> lesson = choice(answers.path("first_lesson"), byLabel);
				if (lesson == null) {
					return Optional.empty();
				}
				firstLesson = lesson.value();
			}
		}
		JsonNode model = response.path("model");
		boolean validModel = model.isString() && MODEL_ID.matcher(model.stringValue()).matches();
		return Optional.of(new Judgement(role.value(), role.probabilities(), CategorizationRules.focusFromNoul(noul),
				focus, validModel ? model.stringValue() : null, gaps, firstLesson));
	}

	private static <E extends Enum<E>> JevChoice<E> choice(JsonNode answer, E[] values) {
		Map<String, E> byLabel = new LinkedHashMap<>();
		for (E value : values) {
			byLabel.put(WireNames.of(value), value);
		}
		return choice(answer, byLabel);
	}

	private static <T> JevChoice<T> choice(JsonNode answer, Map<String, T> byLabel) {
		JsonNode label = answer.path("choice");
		JsonNode probabilities = answer.path("probabilities");
		if (!label.isString() || !byLabel.containsKey(label.stringValue()) || !probabilities.isObject()) {
			return null;
		}
		Map<String, Double> parsed = new LinkedHashMap<>();
		for (Map.Entry<String, JsonNode> p : probabilities.properties()) {
			Double value = probability(p.getValue());
			if (!byLabel.containsKey(p.getKey()) || value == null) {
				return null;
			}
			parsed.put(p.getKey(), value);
		}
		if (!parsed.keySet().equals(byLabel.keySet())
				|| parsed.get(label.stringValue()) < Collections.max(parsed.values())) {
			return null;
		}
		return new JevChoice<>(byLabel.get(label.stringValue()), parsed);
	}

	private static Double probability(JsonNode value) {
		return value.isNumber() && value.doubleValue() >= 0 && value.doubleValue() <= 1 ? value.doubleValue() : null;
	}

}
