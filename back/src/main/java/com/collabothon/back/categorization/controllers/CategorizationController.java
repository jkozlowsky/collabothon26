package com.collabothon.back.categorization.controllers;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.CategorizationRequestDto;
import com.collabothon.back.categorization.services.CategorizationService;
import com.collabothon.back.common.validation.UserId;

import lombok.RequiredArgsConstructor;

// ponytail: no auth; the id comes from the host bank app's session, prototype passes it in the path.
@RestController
@RequestMapping("/api/users/{userId}/categorization")
@RequiredArgsConstructor
class CategorizationController {

	private final CategorizationService service;

	@PostMapping
	ResponseEntity<CategorizationDto> categorize(@PathVariable @UserId String userId,
			@Valid @RequestBody CategorizationRequestDto request) {
		return ResponseEntity.ok(service.categorize(userId, request));
	}

	@GetMapping
	ResponseEntity<CategorizationDto> get(@PathVariable @UserId String userId) {
		return ResponseEntity.ok(service.get(userId));
	}

}
