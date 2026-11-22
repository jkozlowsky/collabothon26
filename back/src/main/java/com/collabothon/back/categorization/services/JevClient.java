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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.net.ssl.SSLHandshakeException;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;
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
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.enums.WireNames;

import jakarta.annotation.PreDestroy;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
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
			    "instructions": "Which learner level fits this person best, judging by the facts about their accounts in `facts` and their knowledge answers in `checkAnswers`, when present?",
			    "criteria": {
			      "novice": "Is starting out: has no habit of regular saving and no investments, and any knowledge answers show that basic money ideas are still new to them.",
			      "intermediate": "Has some of the basics: saves regularly or invests but not both, or their knowledge answers are mixed or ahead of these habits.",
			      "advanced": "Is past the basics: saves regularly and invests, and any knowledge answers show that they understand the ideas they were asked about."}},
			  "focus_saving":     {"type": "noul", "instructions": "Would learning how to build an emergency fund help this person now?"},
			  "focus_debt":       {"type": "noul", "instructions": "Would learning how to avoid expensive debt help this person now?"},
			  "focus_investing":  {"type": "noul", "instructions": "Would learning how investing works help this person now?"},
			  "focus_risk":       {"type": "noul", "instructions": "Would learning how to spread financial risk help this person now?"},
			  "focus_retirement": {"type": "noul", "instructions": "Would learning how to plan for retirement help this person now?"}
			}
			""";

	// Verbatim from docs/specs/F1b-quick-check.md ("Jev step call"); `next.criteria` is filled per request, and
	// before the first answer `first` is sent in its place.
	private static final String STEP_QUESTIONS = """
			{
			  "mastery_saving":    {"type": "noul", "instructions": "Do this person's saving answers, the entries of `answers` whose `area` is saving, show that they understand ideas such as inflation, an emergency fund and how savings grow?"},
			  "mastery_debt":      {"type": "noul", "instructions": "Do this person's borrowing answers, the entries of `answers` whose `area` is debt, show that they understand ideas such as instalments, card debt and the full cost of a loan?"},
			  "mastery_investing": {"type": "noul", "instructions": "Do this person's investing answers, the entries of `answers` whose `area` is investing, show that they understand ideas such as market falls, borrowing to invest and spreading risk?"},
			  "next": {"type": "choice",
			    "instructions": "The next test question will come from one of these lessons. Which lesson would show best what this person still needs to learn, given their answers so far in `answers` and when they might need their money in `profile.horizon`?",
			    "criteria": {}},
			  "first": {"type": "choice",
			    "instructions": "The first test question will come from one of these lessons. Which lesson's topic matters most for this person's situation, given their goals in `goals`, when they might need their money in `profile.horizon` and, when given, the facts about their accounts in `facts`?",
			    "criteria": {}},
			  "enough": {"type": "noul", "instructions": "Do the answers so far show clearly enough what this person already understands and what they should learn first?"}
			}
			""";

	// Verbatim from docs/specs/F1b-quick-check.md ("Jev final call"); `first_lesson.criteria` is filled per request.
	private static final String FINAL_QUESTIONS = """
			{
			  "first_lesson": {"type": "choice",
			    "instructions": "Which of these lessons should this person start with, given which ideas their knowledge answers in `checkAnswers` show they have not mastered yet?",
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
			List<JevAnswerDto> answers, List<FocusArea> answeredAreas, List<CheckLesson> lessons) {
		Map<String, Object> state = new LinkedHashMap<>();
		state.put("profile", profile);
		putIfGiven(state, "goals", goals);
		putIfGiven(state, "facts", facts);
		putIfGiven(state, "answers", answers);
		// Before the first answer there is nothing to rate.
		boolean first = answers.isEmpty();
		ObjectNode asked = stepQuestions.objectNode();
		answeredAreas.stream()
			.map(area -> "mastery_" + area.wire())
			// ponytail: an area gets a mastery question only once its text is in STEP_QUESTIONS (areas without lessons).
			.filter(stepQuestions::has)
			.forEach(key -> asked.set(key, stepQuestions.get(key).deepCopy()));
		if (lessons.size() >= JevConsts.MIN_CHOICE_LABELS) {
			asked.set("next", lessonChoice(stepQuestions.get(first ? "first" : "next"), lessons));
		}
		if (!first) {
			asked.set("enough", stepQuestions.get("enough").deepCopy());
		}
		JevRequestDto body = new JevRequestDto(properties.model(), state, asked);
		long start = System.nanoTime();
		Future<JsonNode> call = stepCalls.submit(() -> post(body));
		try {
			JsonNode response = call.get(JevConsts.STEP_READ_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
			Optional<StepJudgement> judgement = parseStep(response, asked, lessons,
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

	private static Optional<StepJudgement> parseStep(JsonNode response, ObjectNode asked, List<CheckLesson> lessons,
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
		Double enough = asked.has("enough") ? probability(answers.path("enough").path("noul")) : Double.valueOf(0);
		String next = asked.has("next") ? lessonId(answers.path("next"), lessons) : null;
		if (enough == null || (asked.has("next") && next == null)) {
			return Optional.empty();
		}
		return Optional.of(new StepJudgement(mastery, next, enough, elapsed));
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
		putIfGiven(state, "answers", givenAnswers(answers));
		putIfGiven(state, "facts", facts);
		ObjectNode asked = questions;
		if (quickCheck != null) {
			state.put("profile", quickCheck.profile());
			putIfGiven(state, "goals", quickCheck.goals());
			// F1 already names the onboarding answers `answers`, so the knowledge answers get their own key.
			state.put("checkAnswers", quickCheck.answers());
			asked = questions.deepCopy();
			if (!quickCheck.lessons().isEmpty()) {
				asked.set("first_lesson", lessonChoice(finalQuestions.get("first_lesson"), quickCheck.lessons()));
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

	private static Map<String, Object> givenAnswers(OnboardingAnswersDto answers) {
		Map<String, Object> given = new LinkedHashMap<>();
		putIfGiven(given, "lifeStage", answers.lifeStage());
		putIfGiven(given, "goals", answers.goals());
		putIfGiven(given, "experience", answers.experience());
		if (answers.skipped()) {
			given.put("skipped", true);
		}
		return given;
	}

	// The model can read a null or empty field as a signal, so such a field is not sent.
	private static void putIfGiven(Map<String, Object> state, String key, Object value) {
		if (!ObjectUtils.isEmpty(value)) {
			state.put(key, value);
		}
	}

	/** A choice among lessons: each option is named by the lesson's topic and described by what the lesson covers. */
	private static ObjectNode lessonChoice(JsonNode question, List<CheckLesson> lessons) {
		ObjectNode choice = (ObjectNode) question.deepCopy();
		ObjectNode criteria = choice.putObject("criteria");
		lessons.forEach(lesson -> {
			ObjectNode option = criteria.putObject(lesson.label()).put("topic", lesson.topic());
			ArrayNode concepts = option.putArray("concepts");
			lesson.concepts().forEach(concept -> concepts.add(concept.replace('-', ' ')));
		});
		return choice;
	}

	private static Optional<Judgement> parse(JsonNode response, JevQuickCheck quickCheck) {
		if (response == null) {
			return Optional.empty();
		}
		JsonNode answers = response.path("answers");
		JevChoice<Role> role = choice(answers.path("role"), List.of(Role.values()), WireNames::of);
		if (role == null) {
			return Optional.empty();
		}
		Map<FocusArea, Double> noul = new EnumMap<>(FocusArea.class);
		for (FocusArea area : FocusArea.values()) {
			Double p = probability(answers.path("focus_" + area.wire()).path("noul"));
			if (p == null) {
				return Optional.empty();
			}
			noul.put(area, p);
		}
		String firstLesson = null;
		if (quickCheck != null && !quickCheck.lessons().isEmpty()) {
			firstLesson = lessonId(answers.path("first_lesson"), quickCheck.lessons());
			if (firstLesson == null) {
				return Optional.empty();
			}
		}
		JsonNode model = response.path("model");
		boolean validModel = model.isString() && MODEL_ID.matcher(model.stringValue()).matches();
		return Optional.of(new Judgement(role.value(), role.probabilities(), CategorizationRules.focusFromNoul(noul),
				QuickCheckRules.byWire(noul), validModel ? model.stringValue() : null, firstLesson));
	}

	/** Null when the answer broke the contract. */
	private static String lessonId(JsonNode answer, List<CheckLesson> lessons) {
		JevChoice<CheckLesson> choice = choice(answer, lessons, CheckLesson::label);
		return choice == null ? null : choice.value().id();
	}

	private static <T> JevChoice<T> choice(JsonNode answer, List<T> options, Function<T, String> labelOf) {
		Map<String, T> byLabel = options.stream().collect(Collectors.toMap(labelOf, Function.identity()));
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
