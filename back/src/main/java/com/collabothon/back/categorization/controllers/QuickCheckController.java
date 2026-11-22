package com.collabothon.back.categorization.controllers;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.categorization.dto.StepRequestDto;
import com.collabothon.back.categorization.dto.StepResponseDto;
import com.collabothon.back.categorization.services.QuickCheckService;
import com.collabothon.back.common.validation.UserId;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/quick-check")
@RequiredArgsConstructor
class QuickCheckController {

	private final QuickCheckService service;

	@PostMapping("/step")
	ResponseEntity<StepResponseDto> step(@PathVariable @UserId String userId,
			@Valid @RequestBody StepRequestDto request) {
		return ResponseEntity.ok(service.step(userId, request));
	}

}
