package com.collabothon.back.glossary.controllers;

import java.util.List;

import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.validation.NoNul;
import com.collabothon.back.common.validation.UserId;
import com.collabothon.back.glossary.consts.GlossaryConsts;
import com.collabothon.back.glossary.services.GlossaryUserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/glossary")
@RequiredArgsConstructor
public class GlossaryUserController {

	private final GlossaryUserService userService;

	@GetMapping("/favorites")
	public ResponseEntity<List<String>> favorites(
			@PathVariable @UserId String userId) {
		return ResponseEntity.ok(userService.getFavorites(userId));
	}

	@PutMapping("/favorites/{slug}")
	public ResponseEntity<Void> addFavorite(
			@PathVariable @UserId String userId,
			@PathVariable @Size(max = GlossaryConsts.MAX_SLUG_LENGTH) @NoNul String slug) {
		userService.addFavorite(userId, slug);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/favorites/{slug}")
	public ResponseEntity<Void> removeFavorite(
			@PathVariable @UserId String userId,
			@PathVariable @Size(max = GlossaryConsts.MAX_SLUG_LENGTH) @NoNul String slug) {
		userService.removeFavorite(userId, slug);
		return ResponseEntity.noContent().build();
	}

}
