package com.collabothon.back.categorization;

import java.util.List;

public record ProfileAnswers(String lifeStage, List<String> goals, String experience, boolean onboardingSkipped) {
}
