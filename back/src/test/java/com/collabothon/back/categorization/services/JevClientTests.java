package com.collabothon.back.categorization.services;

import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.lang.reflect.RecordComponent;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.net.ssl.SSLHandshakeException;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.JevInterestDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;

import tools.jackson.databind.json.JsonMapper;

class JevClientTests {

	private static final OnboardingAnswersDto ANSWERS = new OnboardingAnswersDto(null, List.of(), "occasional", false);

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static final JevResult NOT_SENT = new JevResult(Optional.empty(), false);

	static final JevResult SENT_WITHOUT_ANSWER = new JevResult(Optional.empty(), true);

	private static JevProperties properties(String baseUrl, String apiKey) {
		return new JevProperties(URI.create(baseUrl), apiKey, JevConsts.DEFAULT_MODEL);
	}

	private static JevResult ask(RestClient.Builder builder, String baseUrl, String apiKey) {
		return new JevClient(builder, JSON, properties(baseUrl, apiKey)).ask(ANSWERS, List.of(), null, null);
	}

	// These records describe what goes to an external model; a new component must be a deliberate change here.
	@Test
	void onlyKnownFieldsAreSentToJev() {
		assertEquals(List.of("lifeStage", "interests", "experience", "skipped"),
				Arrays.stream(OnboardingAnswersDto.class.getRecordComponents()).map(RecordComponent::getName).toList());
		assertEquals(List.of("category", "topic"),
				Arrays.stream(JevInterestDto.class.getRecordComponents()).map(RecordComponent::getName).toList());
		assertEquals(List.of("incomeBand", "cashBufferMonths", "savingsRate", "savesRegularly", "inOverdraft",
				"holdsInvestments", "hasLoan"),
				Arrays.stream(FactsDto.class.getRecordComponents()).map(RecordComponent::getName).toList());
	}

	@Test
	void theAnswersReachJevWithoutInterestIdsAndWithoutEmptyFields() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(jsonPath("$.state", equalTo(Map.of("answers", Map.of("experience", "occasional")))))
			.andRespond(withServerError());
		server.expect(jsonPath("$.state", equalTo(Map.of("answers",
				Map.of("lifeStage", "building", "experience", "occasional", "skipped", true)))))
			.andRespond(withServerError());
		JevClient client = new JevClient(builder, JSON, properties("http://localhost:8000", ""));

		client.ask(ANSWERS, List.of(), null, null);
		client.ask(new OnboardingAnswersDto("building", List.of("berlin"), "occasional", true), List.of(), null, null);
		server.verify();
	}

	@Test
	void theProfileReachesJevWithTheGivenRangesOnlyAndNotAtAllWhenEmpty() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		Map<String, Object> answers = Map.of("experience", "occasional");
		// Whole states are compared: jsonPath's doesNotExist() also passes for a null value.
		server.expect(jsonPath("$.state", equalTo(Map.of()))).andRespond(withServerError());
		server.expect(jsonPath("$.state", equalTo(Map.of()))).andRespond(withServerError());
		server.expect(jsonPath("$.state", equalTo(Map.of("profile", Map.of("ageBand", "26-40")))))
			.andRespond(withServerError());
		server.expect(jsonPath("$.state", equalTo(Map.of("answers", answers, "checkAnswers", List.of()))))
			.andRespond(withServerError());
		JevClient client = new JevClient(builder, JSON, properties("http://localhost:8000", ""));

		client.step(null, List.of(), null, List.of(), List.of(), List.of());
		client.step(new ProfileRangesDto(null, "", null), List.of(), null, List.of(), List.of(), List.of());
		client.step(new ProfileRangesDto("26-40", null, null), List.of(), null, List.of(), List.of(), List.of());
		client.ask(ANSWERS, List.of(), null,
				new JevQuickCheck(new ProfileRangesDto(null, null, null), List.of(), List.of(), Map.of()));
		server.verify();
	}

	// Real JDK client, no stub: nothing can leave when the connection is never established.
	@Test
	void refusedConnectionIsNotSent() {
		assertEquals(NOT_SENT, ask(RestClient.builder(), "http://localhost:1", ""));
	}

	@Test
	void unknownHostIsNotSent() {
		assertEquals(NOT_SENT, ask(RestClient.builder(), "http://jev.invalid", ""));
	}

	@Test
	void brokenResponseHeaderFallsBackButCountsAsSent() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("http://localhost:8000" + JevConsts.SYSTEM_ONE_PATH))
			.andRespond(withStatus(HttpStatus.OK).header(HttpHeaders.CONTENT_TYPE, "not a type").body("{}"));

		assertEquals(SENT_WITHOUT_ANSWER, ask(builder, "http://localhost:8000", ""));
	}

	@Test
	void failedTlsHandshakeIsNotSent() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("https://jev.example" + JevConsts.SYSTEM_ONE_PATH))
			.andRespond(withException(new SSLHandshakeException("certificate rejected")));

		assertEquals(NOT_SENT, ask(builder, "https://jev.example", ""));
	}

	@Test
	void blankKeySendsNoAuthorizationHeader() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(headerDoesNotExist("Authorization")).andRespond(withServerError());

		assertTrue(ask(builder, "http://localhost:8000", " ").sent());
		server.verify();
	}

}
