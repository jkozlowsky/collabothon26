package com.collabothon.back.duel;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.duel.DuelDtos.*;
import com.collabothon.back.duel.DuelRankingService.RankingsDto;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/duel")
@RequiredArgsConstructor
public class DuelController {

	private final DuelService duelService;

	private final DuelRankingService rankingService;

	/** GET /api/duel/categories?userId= — lobby list, stories.json order. */
	@GetMapping("/categories")
	public List<CategoryDto> categories(@RequestParam(required = false) String userId) {
		return duelService.getCategories(userId);
	}

	/** POST /api/duel/matches — start a match against simulated rival (HUMAN) or training (SOLO). */
	@PostMapping("/matches")
	public MatchStartDto start(@Valid @RequestBody StartMatchRequest request) {
		return duelService.startMatch(request);
	}

	/** POST /api/duel/matches/{id}/answers — submit an answer for index 0..5. Idempotent per index. */
	@PostMapping("/matches/{id}/answers")
	public AnswerResultDto answer(@PathVariable @Positive long id, @Valid @RequestBody AnswerRequest request) {
		return duelService.answer(id, request);
	}

	/** GET /api/duel/matches/{id}/state?userId= — polling and resume after reload. */
	@GetMapping("/matches/{id}/state")
	public MatchStateDto state(@PathVariable @Positive long id, @RequestParam @NotBlank String userId) {
		return duelService.state(id, userId);
	}

	/** GET /api/duel/matches/{id}?userId= — result + review; marks the match seen. 409 while not finished. */
	@GetMapping("/matches/{id}")
	public MatchEndDto match(@PathVariable @Positive long id, @RequestParam @NotBlank String userId) {
		return duelService.result(id, userId);
	}

	/** GET /api/duel/matches?userId= — "Historia" tab: unfinished first, then finished newest first, max 50. */
	@GetMapping("/matches")
	public List<MatchSummaryDto> history(@RequestParam @NotBlank String userId) {
		return duelService.history(userId);
	}

	/** GET /api/duel/rankings?userId= — weekly overall only (ISO week, Europe/Warsaw). */
	@GetMapping("/rankings")
	public RankingsDto rankings(@RequestParam(required = false) String userId) {
		return rankingService.getWeeklyRankings(userId);
	}

}
