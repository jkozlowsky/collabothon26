package com.collabothon.back.categorization.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.URI;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.core.NestedExceptionUtils;

import com.collabothon.back.categorization.consts.JevConsts;

@ExtendWith(OutputCaptureExtension.class)
class JevPropertiesTests {

	private static final String FAKE_KEY = "FAKE-NOT-A-KEY";

	private final ApplicationContextRunner context = new ApplicationContextRunner()
		.withConfiguration(AutoConfigurations.of(ConfigurationPropertiesAutoConfiguration.class,
				ValidationAutoConfiguration.class))
		.withUserConfiguration(PropertiesOnly.class);

	private void starts(String... properties) {
		context.withPropertyValues(properties).run(app -> assertNull(app.getStartupFailure()));
	}

	private void failsOn(String property, String... properties) {
		context.withPropertyValues(properties).run(app -> {
			Throwable failure = app.getStartupFailure();
			assertNotNull(failure);
			Throwable root = NestedExceptionUtils.getMostSpecificCause(failure);
			assertTrue(root.getMessage().contains(property), root.getMessage());
		});
	}

	@Test
	void startsWithTheDefaults() {
		context.run(app -> {
			assertNull(app.getStartupFailure());
			assertFalse(app.getBean(JevProperties.class).callsJev());
		});
	}

	@Test
	void startsWithEverySupportedSetup() {
		starts("jev.base-url=https://jev.example", "jev.api-key=k");
		starts("jev.base-url=http://selfjev:8000");
		starts("jev.base-url=http://localhost:8000", "jev.api-key=k");
		starts("jev.base-url=http://127.0.0.1:8000", "jev.api-key=k");
		starts("jev.base-url=http://[::1]:8000", "jev.api-key=k");
		starts("jev.base-url=http://localhost:1");
		starts("jev.base-url=http://localhost:65535");
	}

	@Test
	void badConfigurationStopsStartup() {
		failsOn("jev.api-key", "jev.base-url=http://jev.example", "jev.api-key=k");
		failsOn("model", "jev.model=");
		failsOn("jev.base-url", "jev.base-url=localhost:8000");
		failsOn("jev.api-key", "jev.api-key=bad\u0007key");
		failsOn("jev.base-url", "jev.base-url=http://localhost:99999");
		failsOn("jev.base-url", "jev.base-url=http://localhost:0");
	}

	@Test
	void callIsSkippedOnlyWithoutKeyOnTheHostedApi() {
		assertFalse(properties("https://api.typesafe.ai", " \r\n").callsJev());
		assertFalse(properties("HTTPS://API.TYPESAFE.AI/", "").callsJev());
		assertTrue(properties("http://localhost:8000", "").callsJev());
		assertTrue(properties("https://api.typesafe.ai", "key").callsJev());
		assertEquals("key", properties("https://api.typesafe.ai", " key \n").apiKey());
	}

	// Through SpringApplication, as the failure analysis it prints is where a rejected value shows up.
	@ParameterizedTest
	@CsvSource({
			"FAKE-NOT-A-KEY with-space, https://jev.example, jev.api-key must be printable ASCII",
			"FAKE-NOT-A-KEY, http://localhost:99999, jev.base-url must be an absolute http(s) URL",
			"FAKE-NOT-A-KEY, http://jev.example, jev.api-key is only sent over https",
			"FAKE-NOT-A-KEY, http://bad host, jev.base-url" })
	void failedStartupNeverShowsTheKey(String key, String baseUrl, String reason, CapturedOutput output) {
		SpringApplicationBuilder app = new SpringApplicationBuilder(PropertiesOnly.class).web(WebApplicationType.NONE);
		Exception failure = assertThrows(Exception.class,
				() -> app.run("--jev.api-key=" + key, "--jev.base-url=" + baseUrl));

		StringWriter chain = new StringWriter();
		failure.printStackTrace(new PrintWriter(chain, true));
		assertFalse(chain.toString().contains(FAKE_KEY), "the key is in the cause chain");
		assertFalse(output.getAll().contains(FAKE_KEY), "the key is in the startup output");
		assertTrue(output.getAll().contains(reason), reason);
	}

	@Test
	void toStringHidesTheKey() {
		String text = properties("https://jev.example", FAKE_KEY).toString();

		assertFalse(text.contains(FAKE_KEY), "the key is in toString");
		assertTrue(text.contains("https://jev.example"), "the URL is still shown");
	}

	private static JevProperties properties(String baseUrl, String apiKey) {
		return new JevProperties(URI.create(baseUrl), apiKey, JevConsts.DEFAULT_MODEL);
	}

}
