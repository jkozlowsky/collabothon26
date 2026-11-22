package com.collabothon.back.profile.controllers;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.validation.UserId;
import com.collabothon.back.dto.profile.LessonModeRequest;
import com.collabothon.back.profile.services.UserProfileService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class LessonModeController {

	private final UserProfileService userProfileService;

	@PutMapping("/api/users/{userId}/lesson-mode")
	public ResponseEntity<Void> save(
			@PathVariable @UserId String userId,
			@Valid @RequestBody LessonModeRequest req) {
		userProfileService.saveLessonMode(userId, req.mode());
		return ResponseEntity.noContent().build();
	}

}
