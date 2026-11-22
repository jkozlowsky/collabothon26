package com.collabothon.back.categorization.services;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.sun.net.httpserver.HttpServer;

// A followed redirect would re-send the body to a second host, which the sent flag cannot account for.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class JevRedirectTests {

	private static final AtomicInteger ASKED = new AtomicInteger();

	private static final AtomicInteger REDIRECTED = new AtomicInteger();

	// Contract-valid, so only the 3xx status can make the client reject it.
	private static final byte[] VALID_ANSWER = """
			{"model": "jev-latest", "answers": {
			  "role": {"type": "choice", "choice": "novice", "confidence": 0.9,
			           "probabilities": {"novice": 0.9, "intermediate": 0.08, "advanced": 0.02}},
			  "focus_saving": {"type": "noul", "noul": 0.9}, "focus_debt": {"type": "noul", "noul": 0.1},
			  "focus_investing": {"type": "noul", "noul": 0.1}, "focus_risk": {"type": "noul", "noul": 0.1},
			  "focus_retirement": {"type": "noul", "noul": 0.1}}}""".getBytes(StandardCharsets.UTF_8);

	private static final HttpServer JEV = redirectingServer();

	@DynamicPropertySource
	static void jevUrl(DynamicPropertyRegistry registry) {
		registry.add("jev.base-url", () -> "http://localhost:" + JEV.getAddress().getPort());
	}

	@AfterAll
	static void stop() {
		JEV.stop(0);
	}

	@Autowired
	JevClient jev;

	@Test
	void redirectIsNotFollowed() {
		OnboardingAnswersDto answers = new OnboardingAnswersDto(null, List.of(), "occasional", false);
		JevResult result = jev.ask(answers, List.of(), null, null);

		assertEquals(1, ASKED.get());
		assertEquals(0, REDIRECTED.get());
		assertEquals(JevClientTests.SENT_WITHOUT_ANSWER, result);
	}

	private static HttpServer redirectingServer() {
		try {
			HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
			server.createContext(JevConsts.SYSTEM_ONE_PATH, exchange -> {
				ASKED.incrementAndGet();
				exchange.getRequestBody().readAllBytes();
				exchange.getResponseHeaders().add(HttpHeaders.LOCATION, "/moved");
				exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
				exchange.sendResponseHeaders(HttpStatus.TEMPORARY_REDIRECT.value(), VALID_ANSWER.length);
				exchange.getResponseBody().write(VALID_ANSWER);
				exchange.close();
			});
			server.createContext("/moved", exchange -> {
				REDIRECTED.incrementAndGet();
				exchange.getRequestBody().readAllBytes();
				exchange.sendResponseHeaders(HttpStatus.INTERNAL_SERVER_ERROR.value(), -1);
				exchange.close();
			});
			server.start();
			return server;
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

}
