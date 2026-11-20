package com.collabothon.back.categorization;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;

import com.collabothon.back.categorization.consts.JevConsts;

class JevPropertiesTests {

	private final ApplicationContextRunner context = new ApplicationContextRunner()
		.withConfiguration(AutoConfigurations.of(ConfigurationPropertiesAutoConfiguration.class,
				ValidationAutoConfiguration.class))
		.withUserConfiguration(PropertiesOnly.class);

	@EnableConfigurationProperties(JevProperties.class)
	static class PropertiesOnly {
	}

	private void starts(String... properties) {
		context.withPropertyValues(properties).run(app -> assertThat(app).hasNotFailed());
	}

	private void failsOn(String property, String... properties) {
		context.withPropertyValues(properties)
			.run(app -> assertThat(app).getFailure().rootCause().hasMessageContaining(property));
	}

	@Test
	void startsWithTheDefaults() {
		context.run(app -> assertThat(app).hasNotFailed()
			.getBean(JevProperties.class)
			.satisfies(p -> assertThat(p.callsJev()).isFalse()));
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
		assertThat(properties("https://api.typesafe.ai", " \r\n").callsJev()).isFalse();
		assertThat(properties("HTTPS://API.TYPESAFE.AI/", "").callsJev()).isFalse();
		assertThat(properties("http://localhost:8000", "").callsJev()).isTrue();
		assertThat(properties("https://api.typesafe.ai", "key").callsJev()).isTrue();
		assertThat(properties("https://api.typesafe.ai", " key \n").apiKey()).isEqualTo("key");
	}

	static JevProperties properties(String baseUrl, String apiKey) {
		return new JevProperties(URI.create(baseUrl), apiKey, JevConsts.DEFAULT_MODEL);
	}

}
