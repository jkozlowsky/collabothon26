package com.collabothon.back.categorization.services;

import java.time.Duration;
import java.util.Map;

import com.collabothon.back.categorization.enums.FocusArea;

/**
 * {@code nextLesson} is a lesson id; null when the question was not asked (fewer than two lessons to choose from).
 * {@code enough} is 0 when it was not asked (before the first answer).
 */
record StepJudgement(
		Map<FocusArea, Double> mastery,
		String nextLesson,
		double enough,
		Duration elapsed
) {}
