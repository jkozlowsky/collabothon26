package com.collabothon.back.categorization.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.core.NestedExceptionUtils;

import com.collabothon.back.categorization.consts.JevConsts;

class JevPropertiesTests {

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

	private static JevProperties properties(String baseUrl, String apiKey) {
		return new JevProperties(URI.create(baseUrl), apiKey, JevConsts.DEFAULT_MODEL);
	}

}
