package com.collabothon.back.duel;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

// ponytail: no auth; the user id comes from the host app, the prototype passes it as a parameter.
@RestController
@RequestMapping("/api/duel")
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class DuelController {

	private final DuelQueryService queries;

	private final RankingService rankings;

	private final CategoryMapper categoryMapper;

	private final RankingMapper rankingMapper;

	private final MatchResultMapper matchMapper;

	@GetMapping("/categories")
	List<CategoryDto> categories(@RequestParam @NotBlank String userId, @RequestParam(defaultValue = "en") String lang) {
		return categoryMapper.toCategories(queries.categories(userId, DuelLang.from(lang)));
	}

	/** Top 50 plus the caller's own row; {@code scope} is category, overall, friends or weekly. */
	@GetMapping("/rankings")
	RankingsDto rankings(@RequestParam @NotBlank String scope, @RequestParam(required = false) String category,
			@RequestParam(required = false) String userId) {
		return rankingMapper.toDto(rankings.rankings(scope, category, userId));
	}

	/** The result screen of a finished match, so it survives a page reload. */
	@GetMapping("/matches/{id}")
	MatchEndDto match(@PathVariable @Positive long id, @RequestParam @NotBlank String userId,
			@RequestParam(defaultValue = "en") String lang) {
		return matchMapper.toDto(queries.matchResult(id, userId, DuelLang.from(lang)));
	}

	/** Per-category XP, level, Elo and 30-day accuracy for the profile and the other modules. */
	@GetMapping("/progress/{userId}")
	List<ProgressDto> progress(@PathVariable @NotBlank String userId) {
		return categoryMapper.toProgress(queries.progress(userId));
	}

	record CategoryDto(String slug, String name, String icon, int xp, int level, int xpIntoLevel, int xpForLevel,
			int elo, int humanMatches, boolean calibrated) {
	}

	record ProgressDto(String category, int xp, int level, int elo, Double accuracyLast30d) {
	}

	record RankingRowDto(int rank, String userId, String name, int avatar, int level, int elo, int value) {
	}

	record RankingsDto(List<RankingRowDto> top, RankingRowDto me) {
	}

	record PlayerCardDto(String name, int level, Integer elo, int avatar, boolean isBot) {
	}

	record ReviewItemDto(String prompt, List<String> options, Integer yourOption, int correctOption,
			String explanation) {
	}

	record MatchEndDto(long matchId, DuelMode mode, String category, MatchOutcome outcome, int score,
			Integer rivalScore, PlayerCardDto rival, int xpGained, int levelBefore, int levelAfter, int xpIntoLevel,
			int xpForLevel, Integer eloBefore, Integer eloAfter, List<ReviewItemDto> review) {
	}

}
