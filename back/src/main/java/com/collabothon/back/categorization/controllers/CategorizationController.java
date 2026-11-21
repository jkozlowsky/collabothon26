package com.collabothon.back.categorization.controllers;

import static com.collabothon.back.categorization.consts.CategorizationConsts.MAX_USER_ID_LENGTH;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.categorization.dto.CategorizationDto;
import com.collabothon.back.categorization.dto.CategorizationRequestDto;
import com.collabothon.back.categorization.services.CategorizationErrorCode;
import com.collabothon.back.categorization.services.CategorizationService;
import com.collabothon.back.exceptions.BusinessException;

import lombok.RequiredArgsConstructor;

// ponytail: no auth; the id comes from the host bank app's session, prototype passes it in the path.
@RestController
@RequestMapping("/api/users/{userId}/categorization")
@RequiredArgsConstructor
class CategorizationController {

	private final CategorizationService service;

	@PostMapping
	CategorizationDto categorize(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody CategorizationRequestDto request) {
		return service.categorize(userId, request);
	}

	@GetMapping
	CategorizationDto get(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return service.find(userId).orElseThrow(() -> new BusinessException(CategorizationErrorCode.NOT_CATEGORISED_YET));
	}

}
