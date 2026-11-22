package com.collabothon.back.duel.controllers;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.validation.OptionalUserId;
import com.collabothon.back.common.validation.UserId;
import com.collabothon.back.dto.duel.AnswerRequest;
import com.collabothon.back.dto.duel.AnswerResultDto;
import com.collabothon.back.dto.duel.CategoryDto;
import com.collabothon.back.dto.duel.MatchEndDto;
import com.collabothon.back.dto.duel.MatchStartDto;
import com.collabothon.back.dto.duel.MatchStateDto;
import com.collabothon.back.dto.duel.MatchSummaryDto;
import com.collabothon.back.dto.duel.RankingsDto;
import com.collabothon.back.dto.duel.StartMatchRequest;
import com.collabothon.back.duel.services.DuelHistoryService;
import com.collabothon.back.duel.services.DuelLobbyService;
import com.collabothon.back.duel.services.DuelMatchService;
import com.collabothon.back.duel.services.DuelRankingService;
import com.collabothon.back.duel.services.DuelResultService;
import com.collabothon.back.duel.services.DuelStartService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/duel")
@RequiredArgsConstructor
public class DuelController {

	private final DuelLobbyService lobbyService;

	private final DuelStartService startService;

	private final DuelMatchService matchService;

	private final DuelResultService resultService;

	private final DuelHistoryService historyService;

	private final DuelRankingService rankingService;

	@GetMapping("/categories")
	public ResponseEntity<List<CategoryDto>> categories(
			@RequestParam(required = false) @OptionalUserId String userId) {
		return ResponseEntity.ok(lobbyService.categories(userId));
	}

	@PostMapping("/matches")
	public ResponseEntity<MatchStartDto> start(@Valid @RequestBody StartMatchRequest request) {
		return ResponseEntity.ok(startService.start(request));
	}

	@PostMapping("/matches/{id}/answers")
	public ResponseEntity<AnswerResultDto> answer(@PathVariable @Positive long id,
			@Valid @RequestBody AnswerRequest request) {
		return ResponseEntity.ok(matchService.answer(id, request));
	}

	@GetMapping("/matches/{id}/state")
	public ResponseEntity<MatchStateDto> state(@PathVariable @Positive long id,
			@RequestParam @UserId String userId) {
		return ResponseEntity.ok(matchService.state(id, userId));
	}

	@GetMapping("/matches/{id}")
	public ResponseEntity<MatchEndDto> match(@PathVariable @Positive long id,
			@RequestParam @UserId String userId) {
		return ResponseEntity.ok(resultService.result(id, userId));
	}

	@GetMapping("/matches")
	public ResponseEntity<List<MatchSummaryDto>> history(
			@RequestParam @UserId String userId) {
		return ResponseEntity.ok(historyService.history(userId));
	}

	@GetMapping("/rankings")
	public ResponseEntity<RankingsDto> rankings(
			@RequestParam(required = false) @OptionalUserId String userId) {
		return ResponseEntity.ok(rankingService.weeklyRankings(userId));
	}

}
