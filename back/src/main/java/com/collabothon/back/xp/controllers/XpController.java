package com.collabothon.back.xp.controllers;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.xp.CategoryXpDto;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/xp")
@RequiredArgsConstructor
public class XpController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final XpService xpService;

	/** GET /api/xp/{userId}/categories: XP, level and this week's XP per story category, stories.json order. */
	@GetMapping("/{userId}/categories")
	public ResponseEntity<List<CategoryXpDto>> categories(
			@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(xpService.categoryBreakdown(userId));
	}

}
