package com.collabothon.back.duel;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.NotFoundException;
import com.collabothon.back.duel.DuelAnswerRepository.CategoryAccuracy;
import com.collabothon.back.duel.LevelCurve.LevelInfo;
import com.collabothon.back.duel.MatchAssembler.MatchResult;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** Read side of the duel REST API: category cards and progress. */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class DuelQueryService {

	private static final Duration ACCURACY_WINDOW = Duration.ofDays(30);

	private final DuelCategoryRepository categories;

	private final DuelProgressRepository progress;

	private final DuelAnswerRepository answers;

	private final LevelCurve levelCurve;

	private final EloService eloService;

	private final Clock clock;

	/** All categories in lobby order with the player's XP, level and Elo; accuracy is not loaded here. */
	@Transactional(readOnly = true)
	public List<CategoryStanding> categories(String userId, DuelLang lang) {
		return standings(userId, lang, Map.of());
	}

	/** Same rows plus the share of correct answers over the last 30 days (null when there are none). */
	@Transactional(readOnly = true)
	public List<CategoryStanding> progress(String userId) {
		Instant since = clock.instant().minus(ACCURACY_WINDOW);
		Map<Long, Double> accuracy = new HashMap<>();
		for (CategoryAccuracy row : answers.findAccuracyByCategorySince(userId, since)) {
			if (row.getTotalCount() > 0) {
				accuracy.put(row.getCategoryId(), (double) row.getCorrectCount() / row.getTotalCount());
			}
		}
		return standings(userId, DuelLang.EN, accuracy);
	}

	private List<CategoryStanding> standings(String userId, DuelLang lang, Map<Long, Double> accuracyByCategory) {
		Map<Long, DuelProgress> byCategory = new HashMap<>();
		progress.findByUserId(userId).forEach(stats -> byCategory.put(stats.getCategoryId(), stats));
		return categories.findAllByOrderByPositionAsc().stream().map(category -> {
			DuelProgress stats = byCategory.getOrDefault(category.getId(), new DuelProgress(userId, category.getId()));
			return new CategoryStanding(category, stats, levelCurve.fromXp(stats.getXp()),
					eloService.isCalibrated(stats.getHumanMatches()), accuracyByCategory.get(category.getId()), lang);
		}).toList();
	}

	/** One category with the player's standing in it; {@code progress} is a fresh row for a player who never played. */
	record CategoryStanding(DuelCategory category, DuelProgress progress, LevelInfo level, boolean calibrated,
			Double accuracy, DuelLang lang) {
	}

}
