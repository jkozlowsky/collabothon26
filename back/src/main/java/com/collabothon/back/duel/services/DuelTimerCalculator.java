package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.entities.duel.DuelQuestion;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Time limit per question: a base time per step type plus reading time for the words shown, clamped to the
 * configured range. A {@code timeLimitMs} in the content file overrides it.
 */
@Component
@RequiredArgsConstructor
public class DuelTimerCalculator {

	private static final long DEFAULT_BASE_MS = 20_000L;

	private static final long MS_PER_SECOND = 1000L;

	private static final int PAIR_SIZE = 2;

	private final DuelProperties properties;

	public long timeLimitMs(DuelQuestion question) {
		if (question.timeLimitMs() != null) {
			return question.timeLimitMs();
		}
		long readingMs = (long) Math.ceil(countWords(question.step()) / properties.readingWordsPerSecond())
				* MS_PER_SECOND;
		return Math.clamp(baseMs(question.type()) + readingMs, properties.minTimeLimitMs(),
				properties.maxTimeLimitMs());
	}

	private long baseMs(String type) {
		return switch (type) {
			case "quiz" -> properties.quizBaseMs();
			case "predict" -> properties.predictBaseMs();
			case "chart" -> properties.chartBaseMs();
			case "sort" -> properties.sortBaseMs();
			case "match" -> properties.matchBaseMs();
			default -> DEFAULT_BASE_MS;
		};
	}

	/** Words the player has to read: the prompt plus the type's options, items, pairs or labels. */
	public static int countWords(ObjectNode step) {
		List<JsonNode> texts = new ArrayList<>();
		texts.add(step.path("prompt"));
		switch (step.path("type").asString()) {
			case "quiz" -> step.path("options").forEach(texts::add);
			case "sort" -> step.path("items").forEach(item -> texts.add(itemText(item)));
			case "match" -> step.path("pairs").forEach(pair -> addPair(texts, pair));
			case "chart" -> {
				texts.add(step.path("output").path("label"));
				texts.add(step.path("output").path("unit"));
			}
			case "predict" -> texts.add(step.path("input").path("unit"));
			default -> {
				// prompt only
			}
		}
		String text = String.join(" ", texts.stream().filter(DuelTimerCalculator::hasText).map(JsonNode::asString)
			.toList()).trim();
		if (text.isEmpty()) {
			return 0;
		}
		return text.split("\\s+").length;
	}

	private static JsonNode itemText(JsonNode item) {
		if (item.isObject()) {
			return item.path("text");
		}
		return item;
	}

	private static void addPair(List<JsonNode> texts, JsonNode pair) {
		if (pair.isArray() && pair.size() >= PAIR_SIZE) {
			texts.add(pair.get(0));
			texts.add(pair.get(1));
		}
		else if (pair.isObject()) {
			texts.add(pair.path("left"));
			texts.add(pair.path("right"));
		}
	}

	private static boolean hasText(JsonNode node) {
		return node != null && !node.isMissingNode() && !node.isNull();
	}

}
