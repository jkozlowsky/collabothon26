package com.collabothon.back.categorization.services;

import java.time.Duration;
import java.util.Map;

import com.collabothon.back.categorization.enums.FocusArea;

/** {@code next} is null when the question was not asked (fewer than two unasked ids). */
record StepJudgement(
		Map<FocusArea, Double> mastery,
		String next,
		double enough,
		Duration elapsed
) {}
