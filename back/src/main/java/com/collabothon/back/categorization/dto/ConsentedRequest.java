package com.collabothon.back.categorization.dto;

import jakarta.validation.constraints.AssertTrue;

public interface ConsentedRequest {

	Boolean consent();

	FactsDto facts();

	ProfileRangesDto profile();

	@AssertTrue(message = "facts are only accepted with consent")
	default boolean isFactsOnlyWithConsent() {
		return facts() == null || Boolean.TRUE.equals(consent());
	}

	@AssertTrue(message = "savings cover is only asked without consent")
	default boolean isSavingsCoverOnlyWithoutConsent() {
		ProfileRangesDto profile = profile();
		return profile == null || profile.savingsCover() == null || !Boolean.TRUE.equals(consent());
	}

}
