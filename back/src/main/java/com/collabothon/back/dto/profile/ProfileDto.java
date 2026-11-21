package com.collabothon.back.dto.profile;

import java.time.Instant;
import java.util.List;

public record ProfileDto(String userId, String lifeStage, List<String> goals, String experience,
		boolean onboardingCompleted, boolean onboardingSkipped, Instant onboardingCompletedAt) {
}
