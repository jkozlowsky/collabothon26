package com.collabothon.back.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

class DuelPropertiesTests {

	@Test
	void bindsTheConfiguredValuesAndDefaultsTheRest() {
		DuelProperties properties = new Binder(new MapConfigurationPropertySource(
				Map.of("app.duel.questions-per-match", "3", "app.duel.bot-max-delay-ms", "9000")))
			.bindOrCreate("app.duel", DuelProperties.class);

		assertThat(properties.questionsPerMatch()).isEqualTo(3);
		assertThat(properties.botMaxDelayMs()).isEqualTo(9000);
		assertThat(properties.minTimeLimitMs()).isEqualTo(10_000);
	}

}
