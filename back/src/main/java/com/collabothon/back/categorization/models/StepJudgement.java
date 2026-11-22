package com.collabothon.back.categorization.models;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import com.collabothon.back.categorization.enums.FocusArea;

// nextLesson is empty and enough is 0 when that question was not asked.
public record StepJudgement(
		Map<FocusArea, Double> mastery,
		Optional<CheckLesson> nextLesson,
		double enough,
		Duration elapsed
) {}
