package com.collabothon.back.xp.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.validation.UserId;
import com.collabothon.back.dto.xp.CategoryXpDto;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/xp")
@RequiredArgsConstructor
public class XpController {

	private final XpService xpService;

	@GetMapping("/{userId}/categories")
	public ResponseEntity<List<CategoryXpDto>> categories(
			@PathVariable @UserId String userId) {
		return ResponseEntity.ok(xpService.categoryBreakdown(userId));
	}

}
