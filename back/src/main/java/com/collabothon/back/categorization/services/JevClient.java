package com.collabothon.back.categorization.services;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import java.net.ConnectException;
import java.net.UnknownHostException;
import java.net.http.HttpConnectTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Stream;

import javax.net.ssl.SSLHandshakeException;

import org.springframework.core.NestedExceptionUtils;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.JevInterestDto;
import com.collabothon.back.categorization.dto.JevRequestDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.models.JevQuickCheck;
import com.collabothon.back.categorization.models.JevResult;
import com.collabothon.back.categorization.models.JevStepInput;
import com.collabothon.back.categorization.models.Judgement;
import com.collabothon.back.categorization.models.StepJudgement;

import jakarta.annotation.PreDestroy;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
@Slf4j
public class JevClient {

	// Anywhere in the cause chain, these mean the connection was never up, so the body cannot have left.
	private static final List<Class<? extends Throwable>> NOT_SENT = List.of(ConnectException.class,
			UnknownHostException.class, HttpConnectTimeoutException.class, SSLHandshakeException.class);

	private final RestClient rest;

	private final JevProperties properties;

	private final JevRequests requests;

	// ponytail: a Future timeout, as a second request factory would escape MockRestServiceServer and reach the real API
	private final ExecutorService stepCalls = Executors.newVirtualThreadPerTaskExecutor();

	JevClient(RestClient.Builder builder, JsonMapper json, JevProperties properties) {
		if (!properties.apiKey().isEmpty()) {
			builder.defaultHeader(AUTHORIZATION, JevConsts.BEARER_PREFIX + properties.apiKey());
		}
		this.rest = builder.baseUrl(properties.baseUrl()).build();
		this.properties = properties;
		this.requests = new JevRequests(json, properties.model());
	}

	@PreDestroy
	void close() {
		stepCalls.close();
	}

	public JevResult ask(OnboardingAnswersDto answers, List<JevInterestDto> interests, FactsDto facts,
			Optional<JevQuickCheck> quickCheck) {
		if (!properties.callsJev()) {
			return JevResult.SKIPPED;
		}
		JevRequestDto request = requests.categorization(answers, interests, facts, quickCheck);
		try {
			Optional<Judgement> judgement = JevResponses.judgement(post(request), quickCheck);
			if (judgement.isEmpty()) {
				log.warn("Jev answer broke the contract, using the rules fallback");
			}
			return new JevResult(judgement, true);
		}
		catch (IllegalArgumentException e) {
			// Comes from the response (startup validates URL and key), so count it as sent rather than under-report.
			log.warn("Jev call failed ({}), using the rules fallback", e.getClass().getSimpleName());
			return new JevResult(Optional.empty(), true);
		}
		catch (RestClientException e) {
			log.warn("Jev call failed ({}), using the rules fallback",
					NestedExceptionUtils.getMostSpecificCause(e).getClass().getSimpleName());
			return new JevResult(Optional.empty(), !connectionFailed(e));
		}
	}

	public Optional<StepJudgement> step(JevStepInput input) {
		JevRequestDto request = requests.step(input);
		long start = System.nanoTime();
		Future<JsonNode> call = stepCalls.submit(() -> post(request));
		try {
			JsonNode response = call.get(JevConsts.STEP_READ_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
			Duration elapsed = Duration.ofNanos(System.nanoTime() - start);
			Optional<StepJudgement> judgement = JevResponses.stepJudgement(response, request.questions(),
					input.lessons(), elapsed);
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

	private JsonNode post(JevRequestDto request) {
		return rest.post()
			.uri(JevConsts.SYSTEM_ONE_PATH)
			.contentType(MediaType.APPLICATION_JSON)
			.body(request)
			.retrieve()
			// Redirects are not followed, so a 3xx would otherwise be parsed like a 200.
			.onStatus(HttpStatusCode::is3xxRedirection, (sent, redirect) -> {
				throw new RestClientException("Jev redirected");
			})
			.body(JsonNode.class);
	}

	private static boolean connectionFailed(Throwable failure) {
		return Stream.iterate(failure, Objects::nonNull, Throwable::getCause)
			.anyMatch(cause -> NOT_SENT.stream().anyMatch(type -> type.isInstance(cause)));
	}

}
