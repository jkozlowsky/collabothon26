package com.collabothon.back.duel;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** Duel tunables, bound from {@code app.duel.*}; the defaults are the ones in the duel spec. */
@ConfigurationProperties("app.duel")
@Validated
record DuelProperties(
		@Min(1) @DefaultValue("6") int questionsPerMatch,
		@Positive @DefaultValue("40000") long questionTimeoutMs,
		@PositiveOrZero @DefaultValue("5") int queueWidenSec,
		@PositiveOrZero @DefaultValue("10") int queueBotOfferSec,
		@Positive @DefaultValue("1000") long queueTickMs,
		@PositiveOrZero @DefaultValue("150") int queueEloWindow,
		@PositiveOrZero @DefaultValue("8000") long botMinDelayMs,
		@PositiveOrZero @DefaultValue("30000") long botMaxDelayMs) {

	@AssertTrue(message = "app.duel.bot-max-delay-ms must not be below app.duel.bot-min-delay-ms")
	boolean isBotDelayRangeValid() {
		return botMaxDelayMs >= botMinDelayMs;
	}

}
