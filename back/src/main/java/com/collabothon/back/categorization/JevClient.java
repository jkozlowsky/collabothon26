package com.collabothon.back.categorization;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import java.net.ConnectException;
import java.net.UnknownHostException;
import java.net.http.HttpConnectTimeoutException;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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

import com.collabothon.back.bank.Facts;
import com.collabothon.back.categorization.Categorization.LifeStage;
import com.collabothon.back.categorization.Categorization.OnboardingAnswers;
import com.collabothon.back.categorization.Categorization.Role;
import com.collabothon.back.categorization.Rules.Judgement;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@EnableConfigurationProperties(JevProperties.class)
@Slf4j
public class JevClient {

	static final String SYSTEM_ONE_PATH = "/v1/systemone";

	private static final Pattern MODEL_ID = Pattern.compile("[A-Za-z0-9._:-]{1,64}");

	// Anywhere in the cause chain, these mean the connection was never up, so the body cannot have left.
	private static final List<Class<? extends Throwable>> NOT_SENT = List.of(ConnectException.class,
			UnknownHostException.class, HttpConnectTimeoutException.class, SSLHandshakeException.class);

	// Verbatim from docs/specs/F1-profiling.md ("Jev call").
	private static final String QUESTIONS = """
			{
			  "role": {"type": "choice",
			    "instructions": "Based on this person's self-assessment (experience with saving and investing, confidence from 1 to 5 per area) and, when given, their money habits, which learner level fits best?",
			    "criteria": {
			      "novice": "Does not save or invest yet, or feels unsure (low confidence), and shows few healthy money habits such as regular saving or a cash buffer.",
			      "intermediate": "Saves or has tried investing, or feels fairly confident, but does not yet act on it consistently, for example saves but has never invested.",
			      "advanced": "Invests regularly or is experienced and feels confident about it; habits such as regular saving support this."}},
			  "lifeStage": {"type": "choice",
			    "instructions": "Which life stage best describes this person?",
			    "criteria": {
			      "student": "In education or just starting out, with low or irregular income.",
			      "established": "Working in an established career, without mortgage or family costs.",
			      "family": "Mid-life with household costs such as a mortgage or children.",
			      "pre-retirement": "About ten years or less before retirement."}},
			  "focus_saving":     {"type": "noul", "instructions": "Would this person benefit most from learning about building an emergency fund and saving right now?"},
			  "focus_debt":       {"type": "noul", "instructions": "Would this person benefit most from learning about avoiding overdrafts and expensive debt right now?"},
			  "focus_investing":  {"type": "noul", "instructions": "Would this person benefit most from learning how investing works, for example funds and ETFs, right now?"},
			  "focus_risk":       {"type": "noul", "instructions": "Would this person benefit most from learning about risk, diversification and protection right now?"},
			  "focus_retirement": {"type": "noul", "instructions": "Would this person benefit most from learning about planning for retirement and the family's future right now?"}
			}
			""";

	private final RestClient rest;

	private final JevProperties properties;

	private final ObjectNode questions;

	JevClient(RestClient.Builder builder, JsonMapper json, JevProperties properties) {
		if (!properties.apiKey().isEmpty()) {
			builder.defaultHeader(AUTHORIZATION, "Bearer " + properties.apiKey());
		}
		this.rest = builder.baseUrl(properties.baseUrl()).build();
		this.properties = properties;
		this.questions = (ObjectNode) json.readTree(QUESTIONS);
	}

	/** {@code judgement} is empty when the caller must fall back to the rules; {@code sent} says if data left. */
	public record Result(Optional<Judgement> judgement, boolean sent) {

		static final Result SKIPPED = new Result(Optional.empty(), false);

	}

	public Result ask(OnboardingAnswers answers, Facts facts, boolean askLifeStage) {
		if (!properties.callsJev()) {
			return Result.SKIPPED;
		}
		Map<String, Object> state = new LinkedHashMap<>();
		state.put("answers", answers);
		if (facts != null) {
			state.put("facts", facts);
		}
		ObjectNode asked = questions.deepCopy();
		if (!askLifeStage) {
			asked.remove("lifeStage");
		}
		try {
			JsonNode response = rest.post()
				.uri(SYSTEM_ONE_PATH)
				.contentType(MediaType.APPLICATION_JSON)
				.body(new Request(properties.model(), state, asked))
				.retrieve()
				// Redirects are not followed, so a 3xx would otherwise be parsed like a 200.
				.onStatus(HttpStatusCode::is3xxRedirection, (request, redirect) -> {
					throw new RestClientException("Jev redirected");
				})
				.body(JsonNode.class);
			Optional<Judgement> judgement = parse(response, askLifeStage);
			if (judgement.isEmpty()) {
				log.warn("Jev answer broke the contract, using the rules fallback");
			}
			return new Result(judgement, true);
		}
		catch (IllegalArgumentException e) {
			// JevProperties rejects a bad URL or key at startup, so this comes from the response, e.g. a broken
			// Content-Type; counting it as sent over-reports rather than hides what was shared.
			log.warn("Jev call failed ({}), using the rules fallback", e.getClass().getSimpleName());
			return new Result(Optional.empty(), true);
		}
		catch (RestClientException e) {
			log.warn("Jev call failed ({}), using the rules fallback",
					NestedExceptionUtils.getMostSpecificCause(e).getClass().getSimpleName());
			return new Result(Optional.empty(), !connectionFailed(e));
		}
	}

	private static boolean connectionFailed(Throwable e) {
		return Stream.iterate(e, Objects::nonNull, Throwable::getCause)
			.anyMatch(cause -> NOT_SENT.stream().anyMatch(type -> type.isInstance(cause)));
	}

	record Request(String model, Map<String, Object> state, JsonNode questions) {
	}

	private record Choice<E>(E value, Map<String, Double> probabilities) {
	}

	private static Optional<Judgement> parse(JsonNode response, boolean askLifeStage) {
		if (response == null) {
			return Optional.empty();
		}
		JsonNode answers = response.path("answers");
		Choice<Role> role = choice(answers.path("role"), Role.values());
		Choice<LifeStage> lifeStage = askLifeStage ? choice(answers.path("lifeStage"), LifeStage.values())
				: new Choice<>(null, Map.of());
		Map<Area, Double> noul = new EnumMap<>(Area.class);
		Map<String, Double> focus = new LinkedHashMap<>();
		for (Area area : Area.values()) {
			Double p = probability(answers.path(area.jevQuestion()).path("noul"));
			if (p == null) {
				return Optional.empty();
			}
			noul.put(area, p);
			focus.put(area.wire(), p);
		}
		if (role == null || lifeStage == null) {
			return Optional.empty();
		}
		JsonNode model = response.path("model");
		boolean validModel = model.isString() && MODEL_ID.matcher(model.stringValue()).matches();
		return Optional.of(new Judgement(role.value(), role.probabilities(), lifeStage.value(),
				lifeStage.probabilities(), Rules.focusFromNoul(noul), focus, validModel ? model.stringValue() : null));
	}

	private static <E extends Enum<E>> Choice<E> choice(JsonNode answer, E[] values) {
		Map<String, E> byLabel = new LinkedHashMap<>();
		for (E value : values) {
			byLabel.put(Categorization.wireName(value), value);
		}
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
		return new Choice<>(byLabel.get(label.stringValue()), parsed);
	}

	private static Double probability(JsonNode value) {
		return value.isNumber() && value.doubleValue() >= 0 && value.doubleValue() <= 1 ? value.doubleValue() : null;
	}

}
