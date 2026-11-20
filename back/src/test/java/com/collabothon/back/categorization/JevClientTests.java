package com.collabothon.back.categorization;

import static com.collabothon.back.categorization.JevPropertiesTests.properties;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import javax.net.ssl.SSLHandshakeException;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.collabothon.back.bank.Facts;
import com.collabothon.back.categorization.Categorization.Confidence;
import com.collabothon.back.categorization.Categorization.OnboardingAnswers;

import tools.jackson.databind.json.JsonMapper;

class JevClientTests {

	private static final OnboardingAnswers ANSWERS = new OnboardingAnswers(null, List.of(), "none", null,
			new Confidence(null, null, null), false);

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static final JevClient.Result NOT_SENT = new JevClient.Result(Optional.empty(), false);

	static final JevClient.Result SENT_WITHOUT_ANSWER = new JevClient.Result(Optional.empty(), true);

	// Both records go to an external model verbatim; a new component must be a deliberate change here.
	@Test
	void onlyKnownFieldsAreSentToJev() {
		assertThat(Arrays.stream(OnboardingAnswers.class.getRecordComponents()).map(RecordComponent::getName))
			.containsExactly("lifeStage", "goals", "experience", "learningStyle", "confidence", "skipped");
		assertThat(Arrays.stream(Confidence.class.getRecordComponents()).map(RecordComponent::getName))
			.containsExactly("budgeting", "saving", "investing");
		assertThat(Arrays.stream(Facts.class.getRecordComponents()).map(RecordComponent::getName)).containsExactly(
				"ageBand", "incomeBand", "cashBufferMonths", "savingsRate", "savesRegularly", "overdraftMonths",
				"holdsInvestments", "hasMortgage", "hasInsurance");
	}

	// Real JDK client, no stub: nothing can leave when the connection is never established.
	@Test
	void refusedConnectionIsNotSent() {
		assertThat(new JevClient(RestClient.builder(), JSON, properties("http://localhost:1", "")).ask(ANSWERS, null, false))
			.isEqualTo(NOT_SENT);
	}

	@Test
	void unknownHostIsNotSent() {
		assertThat(new JevClient(RestClient.builder(), JSON, properties("http://jev.invalid", "")).ask(ANSWERS, null, false))
			.isEqualTo(NOT_SENT);
	}

	@Test
	void brokenResponseHeaderFallsBackButCountsAsSent() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("http://localhost:8000" + JevClient.SYSTEM_ONE_PATH))
			.andRespond(withStatus(HttpStatus.OK).header(HttpHeaders.CONTENT_TYPE, "not a type").body("{}"));

		assertThat(new JevClient(builder, JSON, properties("http://localhost:8000", "")).ask(ANSWERS, null, false))
			.isEqualTo(SENT_WITHOUT_ANSWER);
	}

	@Test
	void failedTlsHandshakeIsNotSent() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("https://jev.example" + JevClient.SYSTEM_ONE_PATH))
			.andRespond(withException(new SSLHandshakeException("certificate rejected")));

		assertThat(new JevClient(builder, JSON, properties("https://jev.example", "")).ask(ANSWERS, null, false))
			.isEqualTo(NOT_SENT);
	}

	@Test
	void blankKeySendsNoAuthorizationHeader() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(headerDoesNotExist("Authorization")).andRespond(withServerError());

		assertThat(new JevClient(builder, JSON, properties("http://localhost:8000", " ")).ask(ANSWERS, null, false)
			.sent()).isTrue();
		server.verify();
	}

}
