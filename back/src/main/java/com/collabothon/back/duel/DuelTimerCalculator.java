package com.collabothon.back.duel;

import org.springframework.stereotype.Component;

import com.collabothon.back.duel.DuelContent.QuestionDef;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@Component
@RequiredArgsConstructor
public class DuelTimerCalculator {

	private final DuelProperties properties;

	public long timeLimitMs(QuestionDef question) {
		if (question.timeLimitMs() != null) {
			return question.timeLimitMs();
		}
		ObjectNode step = question.step();
		String type = step.path("type").asString();
		long baseMs = switch (type) {
			case "quiz" -> properties.quizBaseMs();
			case "predict" -> properties.predictBaseMs();
			case "chart" -> properties.chartBaseMs();
			case "sort" -> properties.sortBaseMs();
			case "match" -> properties.matchBaseMs();
			default -> 20_000L;
		};
		int words = countWords(step);
		long readingMs = (long) Math.ceil(words / properties.readingWordsPerSecond()) * 1000L;
		return Math.clamp(baseMs + readingMs, properties.minTimeLimitMs(), properties.maxTimeLimitMs());
	}

	public static int countWords(ObjectNode step) {
		StringBuilder sb = new StringBuilder();
		appendField(sb, step.path("prompt"));
		String type = step.path("type").asString();
		switch (type) {
			case "quiz" -> {
				JsonNode opts = step.path("options");
				if (opts.isArray()) {
					for (JsonNode opt : opts) {
						appendField(sb, opt);
					}
				}
			}
			case "sort" -> {
				JsonNode items = step.path("items");
				if (items.isArray()) {
					for (JsonNode item : items) {
						appendField(sb, item.isObject() ? item.path("text") : item);
					}
				}
			}
			case "match" -> {
				JsonNode pairs = step.path("pairs");
				if (pairs.isArray()) {
					for (JsonNode pair : pairs) {
						if (pair.isArray() && pair.size() >= 2) {
							appendField(sb, pair.get(0));
							appendField(sb, pair.get(1));
						}
						else if (pair.isObject()) {
							appendField(sb, pair.path("left"));
							appendField(sb, pair.path("right"));
						}
					}
				}
			}
			case "chart" -> {
				appendField(sb, step.path("output").path("label"));
				appendField(sb, step.path("output").path("unit"));
			}
			case "predict" -> {
				appendField(sb, step.path("input").path("unit"));
			}
		}
		String text = sb.toString().trim();
		if (text.isEmpty()) {
			return 0;
		}
		return text.split("\\s+").length;
	}

	private static void appendField(StringBuilder sb, JsonNode node) {
		if (node != null && !node.isMissingNode() && !node.isNull()) {
			sb.append(node.asString()).append(' ');
		}
	}

}
