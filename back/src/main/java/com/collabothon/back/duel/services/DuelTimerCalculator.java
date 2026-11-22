package com.collabothon.back.duel.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.consts.DuelStepConsts;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.lesson.consts.LessonConsts;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** A question's time limit: a base per step type plus reading time, clamped, unless the content sets one. */
@Component
@RequiredArgsConstructor
public class DuelTimerCalculator {

	private final DuelProperties properties;

	Instant deadline(DuelQuestion question, Instant startedAt) {
		return startedAt.plusMillis(timeLimitMs(question));
	}

	long timeLimitMs(DuelQuestion question) {
		if (question.timeLimitMs() != null) {
			return question.timeLimitMs();
		}
		long readingSeconds = (long) Math.ceil(countWords(question.step()) / properties.readingWordsPerSecond());
		return Math.clamp(baseMs(question.type()) + readingSeconds * DuelConsts.MS_PER_SECOND,
				properties.minTimeLimitMs(), properties.maxTimeLimitMs());
	}

	private long baseMs(String type) {
		return switch (type) {
			case DuelStepConsts.QUIZ -> properties.quizBaseMs();
			case DuelStepConsts.PREDICT -> properties.predictBaseMs();
			case DuelStepConsts.CHART -> properties.chartBaseMs();
			case DuelStepConsts.SORT -> properties.sortBaseMs();
			case DuelStepConsts.MATCH -> properties.matchBaseMs();
			default -> DuelConsts.DEFAULT_BASE_MS;
		};
	}

	static int countWords(ObjectNode step) {
		String text = shownTexts(step).stream()
			.filter(DuelTimerCalculator::hasText)
			.map(JsonNode::asString)
			.collect(Collectors.joining(" "))
			.trim();
		if (text.isEmpty()) {
			return 0;
		}
		return LessonConsts.WHITESPACE.split(text).length;
	}

	private static List<JsonNode> shownTexts(ObjectNode step) {
		List<JsonNode> texts = new ArrayList<>();
		texts.add(step.path("prompt"));
		switch (step.path("type").asString()) {
			case DuelStepConsts.QUIZ -> step.path("options").forEach(texts::add);
			case DuelStepConsts.SORT -> step.path("items").forEach(item -> texts.add(itemText(item)));
			case DuelStepConsts.MATCH -> step.path("pairs").forEach(pair -> addPair(texts, pair));
			case DuelStepConsts.CHART -> {
				texts.add(step.path("output").path("label"));
				texts.add(step.path("output").path("unit"));
			}
			case DuelStepConsts.PREDICT -> texts.add(step.path("input").path("unit"));
		}
		return texts;
	}

	private static JsonNode itemText(JsonNode item) {
		if (item.isObject()) {
			return item.path("text");
		}
		return item;
	}

	private static void addPair(List<JsonNode> texts, JsonNode pair) {
		if (pair.isArray() && pair.size() >= DuelStepConsts.PAIR_SIZE) {
			texts.add(pair.get(0));
			texts.add(pair.get(1));
		}
		else if (pair.isObject()) {
			texts.add(pair.path("left"));
			texts.add(pair.path("right"));
		}
	}

	private static boolean hasText(JsonNode node) {
		return !node.isMissingNode() && !node.isNull();
	}

}
