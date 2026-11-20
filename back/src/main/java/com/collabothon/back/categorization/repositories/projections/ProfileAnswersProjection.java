package com.collabothon.back.categorization.repositories.projections;

import java.util.List;

public record ProfileAnswersProjection(
		String lifeStage,
		List<String> goals,
		String experience,
		boolean onboardingSkipped
) {}
