package com.collabothon.back.categorization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.exceptions.NotFoundException;

import lombok.RequiredArgsConstructor;

// ponytail: no auth; the id comes from the host bank app's session, prototype passes it in the path.
@RestController
@RequestMapping("/api/users/{userId}/categorization")
@RequiredArgsConstructor
class CategorizationController {

	/** {@code user_profile.user_id} is VARCHAR(64). */
	static final int MAX_USER_ID_LENGTH = 64;

	private final CategorizationService service;

	@PostMapping
	Categorization categorize(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody CategorizationRequest request) {
		return service.categorize(userId, request.consent(), request.facts());
	}

	@GetMapping
	Categorization get(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return service.find(userId).orElseThrow(() -> new NotFoundException("Not categorised yet"));
	}

	record CategorizationRequest(@NotNull Boolean consent, @Valid Facts facts) {

		/** We refuse account data the user did not agree to share. */
		@AssertTrue(message = "facts are only accepted with consent")
		boolean isFactsOnlyWithConsent() {
			return facts == null || Boolean.TRUE.equals(consent);
		}

	}

}
