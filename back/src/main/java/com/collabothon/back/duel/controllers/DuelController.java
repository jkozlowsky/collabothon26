package com.collabothon.back.duel.controllers;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/duel")
@RequiredArgsConstructor
public class DuelController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final DuelLobbyService lobbyService;

	private final DuelMatchService matchService;

	private final DuelResultService resultService;

	private final DuelHistoryService historyService;

	private final DuelRankingService rankingService;

	/** GET /api/duel/categories?userId= : lobby list, stories.json order. */
	@GetMapping("/categories")
	public ResponseEntity<List<CategoryDto>> categories(
			@RequestParam(required = false) @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(lobbyService.categories(userId));
	}

	/** POST /api/duel/matches : start a match against the simulated rival (HUMAN) or training (SOLO). */
	@PostMapping("/matches")
	public ResponseEntity<MatchStartDto> start(@Valid @RequestBody StartMatchRequest request) {
		return ResponseEntity.ok(matchService.start(request));
	}

	/** POST /api/duel/matches/{id}/answers : answer question 0..5. Idempotent per index. */
	@PostMapping("/matches/{id}/answers")
	public ResponseEntity<AnswerResultDto> answer(@PathVariable @Positive long id,
			@Valid @RequestBody AnswerRequest request) {
		return ResponseEntity.ok(matchService.answer(id, request));
	}

	/** GET /api/duel/matches/{id}/state?userId= : polling and resume after reload. */
	@GetMapping("/matches/{id}/state")
	public ResponseEntity<MatchStateDto> state(@PathVariable @Positive long id,
			@RequestParam @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(matchService.state(id, userId));
	}

	/** GET /api/duel/matches/{id}?userId= : result and review; marks the match seen. 409 while not finished. */
	@GetMapping("/matches/{id}")
	public ResponseEntity<MatchEndDto> match(@PathVariable @Positive long id,
			@RequestParam @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(resultService.result(id, userId));
	}

	/** GET /api/duel/matches?userId= : "Historia" tab, unfinished first, then finished newest first, max 50. */
	@GetMapping("/matches")
	public ResponseEntity<List<MatchSummaryDto>> history(
			@RequestParam @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(historyService.history(userId));
	}

	/** GET /api/duel/rankings?userId= : weekly overall ranking (ISO week, Europe/Warsaw). */
	@GetMapping("/rankings")
	public ResponseEntity<RankingsDto> rankings(
			@RequestParam(required = false) @Size(max = MAX_USER_ID_LENGTH) String userId) {
		return ResponseEntity.ok(rankingService.weeklyRankings(userId));
	}

}
