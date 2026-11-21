package com.collabothon.back.categorization.controllers;

import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_USER_ID_LENGTH;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.categorization.dto.StepRequestDto;
import com.collabothon.back.categorization.dto.StepResponseDto;
import com.collabothon.back.categorization.services.QuickCheckService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/quick-check")
@RequiredArgsConstructor
class QuickCheckController {

	private final QuickCheckService service;

	@PostMapping("/step")
	StepResponseDto step(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody StepRequestDto request) {
		return service.step(userId, request);
	}

}
