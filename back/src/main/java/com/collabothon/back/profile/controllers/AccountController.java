package com.collabothon.back.profile.controllers;

import java.time.LocalDate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.profile.AccountDto;
import com.collabothon.back.dto.profile.AvatarRequest;
import com.collabothon.back.dto.profile.StatsDto;
import com.collabothon.back.profile.services.AccountService;
import com.collabothon.back.profile.services.DemoProgressService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}")
@RequiredArgsConstructor
public class AccountController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final AccountService accountService;
	private final DemoProgressService demoProgressService;

	@GetMapping("/account")
	public ResponseEntity<AccountDto> account(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(accountService.getAccount(userId));
	}

	@PatchMapping("/account")
	public ResponseEntity<AccountDto> changeAvatar(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId, @Valid @RequestBody AvatarRequest req) {
		return ResponseEntity.ok(accountService.changeAvatar(userId, req.avatar()));
	}

	@GetMapping("/stats")
	public ResponseEntity<StatsDto> stats(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
		return ResponseEntity.ok(accountService.getStats(userId, today));
	}

	@PostMapping("/progress/reset")
	public ResponseEntity<StatsDto> resetProgress(@PathVariable @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
		demoProgressService.reset(userId);
		return ResponseEntity.ok(accountService.getStats(userId, today));
	}
}
