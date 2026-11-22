package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.collabothon.back.duel.models.DuelQuestion;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class DuelTimerCalculatorTests {

	private final DuelTimerCalculator timer = new DuelTimerCalculator(DuelTestFixtures.PROPERTIES);

	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void quizGetsBaseTimePlusReadingTime() {
		// 12 s base + 8 words at 4 words/s = 14 s
		ObjectNode step = json.createObjectNode().put("type", "quiz")
			.put("prompt", "One two three four five six seven eight");

		assertThat(timer.timeLimitMs(question(step, null))).isEqualTo(14_000L);
	}

	@Test
	void emptyQuizGetsTheBaseTime() {
		ObjectNode step = json.createObjectNode().put("type", "quiz").put("prompt", "");

		assertThat(timer.timeLimitMs(question(step, null))).isEqualTo(12_000L);
	}

	@Test
	void longTextIsClampedToTheMaximum() {
		ObjectNode step = json.createObjectNode().put("type", "quiz").put("prompt", "word ".repeat(300));

		assertThat(timer.timeLimitMs(question(step, null))).isEqualTo(60_000L);
	}

	@Test
	void timeLimitFromContentOverridesTheFormula() {
		ObjectNode step = json.createObjectNode().put("type", "quiz").put("prompt", "One two");

		assertThat(timer.timeLimitMs(question(step, 17_500L))).isEqualTo(17_500L);
	}

	@Test
	void countsWordsOfOptionsItemsPairsAndLabels() {
		ObjectNode quiz = json.createObjectNode().put("type", "quiz").put("prompt", "a b");
		quiz.putArray("options").add("c d").add("e");
		ObjectNode sort = json.createObjectNode().put("type", "sort");
		sort.putArray("items").add("a").add(json.createObjectNode().put("text", "b c"));
		ObjectNode match = json.createObjectNode().put("type", "match");
		match.putArray("pairs").add(json.createArrayNode().add("a").add("b c"))
			.add(json.createObjectNode().put("left", "d").put("right", "e"));
		ObjectNode chart = json.createObjectNode().put("type", "chart");
		chart.putObject("output").put("label", "a b").put("unit", "%");

		assertThat(DuelTimerCalculator.countWords(quiz)).isEqualTo(5);
		assertThat(DuelTimerCalculator.countWords(sort)).isEqualTo(3);
		assertThat(DuelTimerCalculator.countWords(match)).isEqualTo(5);
		assertThat(DuelTimerCalculator.countWords(chart)).isEqualTo(3);
	}

	private static DuelQuestion question(ObjectNode step, Long timeLimitMs) {
		return new DuelQuestion("q", "berlin-1", null, List.of(), timeLimitMs, "berlin", step);
	}

}
