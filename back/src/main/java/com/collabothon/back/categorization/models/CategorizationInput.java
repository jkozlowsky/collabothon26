package com.collabothon.back.categorization.models;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.collabothon.back.categorization.dto.CategorizationRequestDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;

public record CategorizationInput(
		String userId,
		CategorizationRequestDto request,
		OnboardingAnswersDto onboarding,
		List<Answer> history,
		Instant at
) {

	// Ranges without an answer are the skip path, so they count only when the Quick check ran.
	public Optional<ProfileRangesDto> quickCheckProfile() {
		if (history.isEmpty()) {
			return Optional.empty();
		}
		return Optional.of(request.profile());
	}

}
