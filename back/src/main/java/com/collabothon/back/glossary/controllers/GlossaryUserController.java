package com.collabothon.back.glossary.controllers;

import java.util.List;

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

import com.collabothon.back.dto.glossary.PreferenceDto;
import com.collabothon.back.dto.glossary.PreferenceRequest;
import com.collabothon.back.glossary.services.GlossaryUserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/glossary")
@RequiredArgsConstructor
public class GlossaryUserController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final GlossaryUserService userService;

	@GetMapping("/favorites")
	public ResponseEntity<List<String>> favorites(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(userService.getFavorites(userId));
	}

	@PutMapping("/favorites/{slug}")
	public ResponseEntity<Void> addFavorite(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId, @PathVariable String slug) {
		userService.addFavorite(userId, slug);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/favorites/{slug}")
	public ResponseEntity<Void> removeFavorite(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId, @PathVariable String slug) {
		userService.removeFavorite(userId, slug);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/preference")
	public ResponseEntity<PreferenceDto> preference(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(userService.getPreference(userId));
	}

	@PutMapping("/preference")
	public ResponseEntity<PreferenceDto> setPreference(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody PreferenceRequest req) {
		return ResponseEntity.ok(userService.setPreference(userId, req.languageLevel()));
	}
}
