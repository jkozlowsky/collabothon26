package com.collabothon.back.lesson.validation;

import java.util.Map;

import com.collabothon.back.lesson.consts.LessonConsts;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class StepRules {

	static void validate(ContentCheck check, String type, JsonNode step) {
		switch (type) {
			case LessonConsts.QUIZ -> checkQuiz(check, step);
			case LessonConsts.MATCH -> checkMatch(check, step);
			case LessonConsts.SORT -> checkSort(check, step);
			case LessonConsts.SLIDER_CHART -> checkSliderChart(check, step);
			case LessonConsts.SCENARIO -> checkScenario(check, step);
			case LessonConsts.ACTION -> checkAction(check, step);
			default -> {
				// Text, chat and predict steps have no rules of their own.
			}
		}
	}

	private static void checkQuiz(ContentCheck check, JsonNode step) {
		int correct = step.path("correctIndex").asInt(-1);
		check.require(correct >= 0 && correct < step.path("options").size(), "correctIndex out of range");
		if (step.has("chart")) {
			checkQuizChart(check, step.get("chart"));
		}
	}

	private static void checkQuizChart(ContentCheck check, JsonNode chart) {
		int points = chart.path("series").size();
		check.require(points >= LessonConsts.QUIZ_CHART_MIN_POINTS && points <= LessonConsts.QUIZ_CHART_MAX_POINTS,
				"chart needs 2–12 points");
		check.require(chart.has("unit"), "chart needs a unit");
		check.require(!chart.has("labels") || chart.path("labels").size() == points, "chart labels must match the points");
	}

	private static void checkMatch(ContentCheck check, JsonNode step) {
		int pairs = step.path("pairs").size();
		check.require(pairs >= LessonConsts.MATCH_MIN_PAIRS && pairs <= LessonConsts.MATCH_MAX_PAIRS,
				"match needs 3–5 pairs");
	}

	private static void checkSort(ContentCheck check, JsonNode step) {
		check.require(step.path("buckets").size() == LessonConsts.SORT_BUCKETS, "sort needs exactly 2 buckets");
		for (JsonNode item : step.path("items")) {
			int bucket = item.path("bucket").asInt(-1);
			check.require(bucket >= 0 && bucket < LessonConsts.SORT_BUCKETS, "item bucket must be 0 or 1");
		}
	}

	private static void checkSliderChart(ContentCheck check, JsonNode step) {
		String model = step.path("model").asString("");
		check.require(LessonConsts.MODELS.contains(model), "unknown model '" + model + "'");
		for (Map.Entry<String, JsonNode> param : step.path("params").properties()) {
			String metric = param.getValue().path("fromBank").asString("");
			check.require(metric.isEmpty() || LessonConsts.NUMBER_METRICS.contains(metric),
					"param " + param.getKey() + " starts from unknown bank number '" + metric + "'");
		}
	}

	private static void checkScenario(ContentCheck check, JsonNode step) {
		check.require(step.path("choices").size() >= LessonConsts.SCENARIO_MIN_CHOICES,
				"scenario needs at least 2 choices");
		for (JsonNode choice : step.path("choices")) {
			check.require(choice.path("series").size() >= LessonConsts.SCENARIO_MIN_SERIES, "every choice needs a series");
		}
	}

	private static void checkAction(ContentCheck check, JsonNode step) {
		check.require(step.has("body") && step.has("bodyNoData"), "action needs body and bodyNoData");
	}

}
