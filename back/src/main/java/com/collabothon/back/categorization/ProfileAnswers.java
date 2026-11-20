package com.collabothon.back.categorization;

import java.util.List;

public record ProfileAnswers(String lifeStage, List<String> goals, String experience, String learningStyle,
		Short confidenceBudgeting, Short confidenceSaving, Short confidenceInvesting, boolean onboardingSkipped) {
}
