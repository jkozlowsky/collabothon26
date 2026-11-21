package com.collabothon.back.glossary;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Per-user glossary state: favourite terms and the "in plain words / standard" preference.
 * Like the profile, the user id comes from the host banking app and is not authenticated (prototype).
 */
@RestController
@RequestMapping("/api/users/{userId}/glossary")
class GlossaryUserController {

	private final JdbcClient jdbc;

	GlossaryUserController(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/** Slugs of the favourite terms, oldest first. */
	@GetMapping("/favorites")
	List<String> favorites(@PathVariable String userId) {
		checkUser(userId);
		return jdbc.sql("""
				SELECT t.slug FROM glossary_favorite f JOIN glossary_term t ON t.id = f.term_id
				WHERE f.user_id = :user ORDER BY f.created_at, t.slug
				""").param("user", userId).query(String.class).list();
	}

	/** Idempotent: saving a term twice keeps one row. */
	@PutMapping("/favorites/{slug}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void addFavorite(@PathVariable String userId, @PathVariable String slug) {
		checkUser(userId);
		int added = jdbc.sql("""
				INSERT INTO glossary_favorite (user_id, term_id)
				SELECT :user, id FROM glossary_term WHERE slug = :slug
				ON CONFLICT DO NOTHING
				""").param("user", userId).param("slug", slug).update();
		if (added == 0 && !termExists(slug)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown term");
		}
	}

	/** Idempotent: removing something that is not saved is fine. */
	@DeleteMapping("/favorites/{slug}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void removeFavorite(@PathVariable String userId, @PathVariable String slug) {
		checkUser(userId);
		jdbc.sql("""
				DELETE FROM glossary_favorite
				WHERE user_id = :user AND term_id = (SELECT id FROM glossary_term WHERE slug = :slug)
				""").param("user", userId).param("slug", slug).update();
	}

	/** languageLevel is null until the user has chosen; the app then derives a default from onboarding. */
	@GetMapping("/preference")
	PreferenceDto preference(@PathVariable String userId) {
		checkUser(userId);
		String level = jdbc.sql("SELECT language_level FROM glossary_preference WHERE user_id = :user")
			.param("user", userId)
			.query(String.class)
			.optional()
			.orElse(null);
		return new PreferenceDto(level);
	}

	@PutMapping("/preference")
	PreferenceDto setPreference(@PathVariable String userId, @Valid @RequestBody PreferenceRequest req) {
		checkUser(userId);
		jdbc.sql("""
				INSERT INTO glossary_preference (user_id, language_level) VALUES (:user, :level)
				ON CONFLICT (user_id) DO UPDATE SET language_level = EXCLUDED.language_level
				""").param("user", userId).param("level", req.languageLevel()).update();
		return new PreferenceDto(req.languageLevel());
	}

	private boolean termExists(String slug) {
		return jdbc.sql("SELECT count(*) FROM glossary_term WHERE slug = :slug")
			.param("slug", slug)
			.query(Integer.class)
			.single() > 0;
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
