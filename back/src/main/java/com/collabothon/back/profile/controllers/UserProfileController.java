package com.collabothon.back.profile.controllers;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.profile.OnboardingRequest;
import com.collabothon.back.dto.profile.ProfileDto;
import com.collabothon.back.profile.services.UserProfileService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/profile")
@RequiredArgsConstructor
public class UserProfileController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final UserProfileService userProfileService;

	@GetMapping
	public ResponseEntity<ProfileDto> get(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(userProfileService.getProfile(userId));
	}

	@PutMapping("/onboarding")
	public ResponseEntity<ProfileDto> saveOnboarding(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody OnboardingRequest req) {
		return ResponseEntity.ok(userProfileService.saveOnboarding(userId, req));
	}

	@DeleteMapping("/onboarding")
	public ResponseEntity<Void> resetOnboarding(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		userProfileService.resetOnboarding(userId);
		return ResponseEntity.noContent().build();
	}
}
