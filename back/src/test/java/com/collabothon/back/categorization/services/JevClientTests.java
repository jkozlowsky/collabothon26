package com.collabothon.back.categorization.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.lang.reflect.RecordComponent;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
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
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;

import tools.jackson.databind.json.JsonMapper;

class JevClientTests {

	private static final OnboardingAnswersDto ANSWERS = new OnboardingAnswersDto(null, List.of(), "occasional", false);

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static final JevResult NOT_SENT = new JevResult(Optional.empty(), false);

	static final JevResult SENT_WITHOUT_ANSWER = new JevResult(Optional.empty(), true);

	private static JevProperties properties(String baseUrl, String apiKey) {
		return new JevProperties(URI.create(baseUrl), apiKey, JevConsts.DEFAULT_MODEL);
	}

	// Both records go to an external model verbatim; a new component must be a deliberate change here.
	@Test
	void onlyKnownFieldsAreSentToJev() {
		assertEquals(List.of("lifeStage", "goals", "experience", "skipped"),
				Arrays.stream(OnboardingAnswersDto.class.getRecordComponents()).map(RecordComponent::getName).toList());
		assertEquals(List.of("incomeBand", "cashBufferMonths", "savingsRate", "savesRegularly", "inOverdraft",
				"holdsInvestments", "hasLoan"),
				Arrays.stream(FactsDto.class.getRecordComponents()).map(RecordComponent::getName).toList());
	}

	// Real JDK client, no stub: nothing can leave when the connection is never established.
	@Test
	void refusedConnectionIsNotSent() {
		assertEquals(NOT_SENT,
				new JevClient(RestClient.builder(), JSON, properties("http://localhost:1", "")).ask(ANSWERS, null, List.of()));
	}

	@Test
	void unknownHostIsNotSent() {
		assertEquals(NOT_SENT,
				new JevClient(RestClient.builder(), JSON, properties("http://jev.invalid", "")).ask(ANSWERS, null, List.of()));
	}

	@Test
	void brokenResponseHeaderFallsBackButCountsAsSent() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("http://localhost:8000" + JevConsts.SYSTEM_ONE_PATH))
			.andRespond(withStatus(HttpStatus.OK).header(HttpHeaders.CONTENT_TYPE, "not a type").body("{}"));

		assertEquals(SENT_WITHOUT_ANSWER,
				new JevClient(builder, JSON, properties("http://localhost:8000", "")).ask(ANSWERS, null, List.of()));
	}

	@Test
	void failedTlsHandshakeIsNotSent() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("https://jev.example" + JevConsts.SYSTEM_ONE_PATH))
			.andRespond(withException(new SSLHandshakeException("certificate rejected")));

		assertEquals(NOT_SENT,
				new JevClient(builder, JSON, properties("https://jev.example", "")).ask(ANSWERS, null, List.of()));
	}

	@Test
	void blankKeySendsNoAuthorizationHeader() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(headerDoesNotExist("Authorization")).andRespond(withServerError());

		assertTrue(new JevClient(builder, JSON, properties("http://localhost:8000", " ")).ask(ANSWERS, null, List.of()).sent());
		server.verify();
	}

}
