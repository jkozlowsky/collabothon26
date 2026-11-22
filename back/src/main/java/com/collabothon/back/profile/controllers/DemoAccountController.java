package com.collabothon.back.profile.controllers;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.profile.DemoAccountDto;
import com.collabothon.back.dto.profile.SessionRequest;
import com.collabothon.back.dto.profile.SessionResponse;
import com.collabothon.back.profile.services.AccountSessionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DemoAccountController {

	private static final int MAX_ID_LENGTH = 64;

	private final AccountSessionService sessionService;

	@GetMapping("/api/demo-accounts")
	public ResponseEntity<List<DemoAccountDto>> demoAccounts(
			@RequestParam(required = false) @Size(max = MAX_ID_LENGTH) String deviceId
	) {
		return ResponseEntity.ok(sessionService.getDemoAccounts(deviceId));
	}

	@PostMapping("/api/users/{userId}/session")
	public ResponseEntity<SessionResponse> acquireSession(
			@PathVariable @NotBlank @Size(max = MAX_ID_LENGTH) String userId,
			@Valid @RequestBody SessionRequest request
	) {
		return ResponseEntity.ok(sessionService.acquireSession(userId, request.deviceId()));
	}

	@PutMapping("/api/users/{userId}/session")
	public ResponseEntity<SessionResponse> heartbeat(
			@PathVariable @NotBlank @Size(max = MAX_ID_LENGTH) String userId,
			@Valid @RequestBody SessionRequest request
	) {
		return ResponseEntity.ok(sessionService.heartbeat(userId, request.deviceId()));
	}

	@DeleteMapping("/api/users/{userId}/session")
	public ResponseEntity<Void> releaseSession(
			@PathVariable @NotBlank @Size(max = MAX_ID_LENGTH) String userId,
			@RequestParam @NotBlank @Size(max = MAX_ID_LENGTH) String deviceId
	) {
		sessionService.releaseSession(userId, deviceId);
		return ResponseEntity.noContent().build();
	}
}
