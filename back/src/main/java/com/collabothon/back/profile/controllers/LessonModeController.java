package com.collabothon.back.profile.controllers;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.profile.LessonModeRequest;
import com.collabothon.back.profile.services.UserProfileService;

import lombok.RequiredArgsConstructor;

/**
 * Remembers the lesson mode the user last switched to (video or transcript), so the next lesson opens in it.
 * The app calls it on every switch, fire and forget; {@code GET /api/lessons/{id}} returns it as {@code startMode}.
 */
@RestController
@RequiredArgsConstructor
public class LessonModeController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final UserProfileService userProfileService;

	@PutMapping("/api/users/{userId}/lesson-mode")
	public ResponseEntity<Void> save(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody LessonModeRequest req) {
		userProfileService.saveLessonMode(userId, req.mode());
		return ResponseEntity.noContent().build();
	}

}
