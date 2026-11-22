package com.collabothon.back.dto.profile;

import java.util.List;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OnboardingRequest(
		@Pattern(regexp = "starting-out|building|settled|later-life") String lifeStage,
		@NotNull @Size(max = MAX_INTERESTS) List<@NotNull @Size(max = MAX_STORY_ID_LENGTH) String> interests,
		@Pattern(regexp = "not-saving|occasional|regular|investing|planning") String experience,
		boolean skipped) {

	public static final int MAX_INTERESTS = 32;

	public static final int MAX_STORY_ID_LENGTH = 64;
}
