package com.collabothon.back.glossary;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;

/**
 * Per-user glossary state: favourite terms and the "in plain words / standard" preference.
 * Like the profile, the user id comes from the host banking app and is not authenticated (prototype).
 */
@RestController
@RequestMapping("/api/users/{userId}/glossary")
@RequiredArgsConstructor
class GlossaryUserController {

	private final GlossaryTermRepository terms;

	private final GlossaryFavoriteRepository favorites;

	private final GlossaryPreferenceRepository preferences;

	/** Slugs of the favourite terms, oldest first. */
	@GetMapping("/favorites")
	List<String> favorites(@PathVariable String userId) {
		checkUser(userId);
		return favorites.findSlugs(userId);
	}

	/** Idempotent: saving a term twice keeps one row. */
	@PutMapping("/favorites/{slug}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void addFavorite(@PathVariable String userId, @PathVariable String slug) {
		checkUser(userId);
		Long termId = terms.findIdBySlug(slug)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown term"));
		if (!favorites.existsById(new GlossaryFavoriteId(userId, termId))) {
			favorites.save(new GlossaryFavorite(userId, termId));
		}
	}

	/** Idempotent: removing something that is not saved is fine. */
	@DeleteMapping("/favorites/{slug}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void removeFavorite(@PathVariable String userId, @PathVariable String slug) {
		checkUser(userId);
		terms.findIdBySlug(slug).ifPresent(termId -> favorites.deleteById(new GlossaryFavoriteId(userId, termId)));
	}

	/** languageLevel is null until the user has chosen; the app then derives a default from onboarding. */
	@GetMapping("/preference")
	PreferenceDto preference(@PathVariable String userId) {
		checkUser(userId);
		return new PreferenceDto(preferences.findById(userId).map(GlossaryPreference::getLanguageLevel).orElse(null));
	}

	@PutMapping("/preference")
	PreferenceDto setPreference(@PathVariable String userId, @Valid @RequestBody PreferenceRequest req) {
		checkUser(userId);
		GlossaryPreference preference = preferences.findById(userId)
			.orElseGet(() -> new GlossaryPreference(userId, req.languageLevel()));
		preference.setLanguageLevel(req.languageLevel());
		preferences.save(preference);
		return new PreferenceDto(req.languageLevel());
	}

	private static void checkUser(String userId) {
		if (userId.isBlank() || userId.length() > 64) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid user id");
		}
	}

	record PreferenceRequest(@NotNull @Pattern(regexp = "plain|standard") String languageLevel) {
	}

	record PreferenceDto(String languageLevel) {
	}

}
