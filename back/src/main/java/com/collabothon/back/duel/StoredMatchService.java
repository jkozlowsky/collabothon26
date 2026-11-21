package com.collabothon.back.duel;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.duel.DuelPersistenceService.PlayerProgression;
import com.collabothon.back.duel.LevelCurve.LevelInfo;
import com.collabothon.back.duel.MatchAssembler.MatchResult;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** Rebuilds the result of a finished match from the database; the result screen reads it once the match has settled. */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class StoredMatchService {

	private final DuelCategoryRepository categories;

	private final DuelQuestionRepository questions;

	private final DuelMatchRepository matches;

	private final DuelMatchQuestionRepository matchQuestions;

	private final DuelAnswerRepository answers;

	private final DuelProgressRepository progress;

	private final DuelPersistenceService persistence;

	private final LevelCurve levelCurve;

	private final ScoringService scoringService;

	/** Empty unless the match is finished and {@code userId} played in it. */
	@Transactional(readOnly = true)
	public Optional<MatchResult> findResult(long matchId, String userId, DuelLang lang) {
		DuelMatch match = matches.findById(matchId).orElse(null);
		if (match == null || match.getStatus() != DuelMatch.Status.FINISHED) {
			return Optional.empty();
		}
		boolean isA = userId.equals(match.getPlayerA());
		if (!isA && !userId.equals(match.getPlayerB())) {
			return Optional.empty();
		}
		DuelCategory category = categories.findById(match.getCategoryId()).orElse(null);
		if (category == null) {
			return Optional.empty();
		}

		boolean solo = match.getMode() == DuelMode.SOLO;
		int score = isA ? match.getScoreA() : match.getScoreB();
		Integer rivalScore = solo ? null : (isA ? match.getScoreB() : match.getScoreA());
		int xpGained = isA ? match.getXpA() : match.getXpB();
		DuelProgress stats = progress.findById(new DuelProgress.Key(userId, match.getCategoryId()))
			.orElseGet(() -> new DuelProgress(userId, match.getCategoryId()));
		LevelInfo after = levelCurve.fromXp(stats.getXp());
		int levelBefore = levelCurve.fromXp(Math.max(0, stats.getXp() - xpGained)).level();

		Integer eloBefore = null;
		Integer eloAfter = null;
		if (match.getMode() == DuelMode.HUMAN) {
			Integer delta = isA ? match.getEloDeltaA() : match.getEloDeltaB();
			eloAfter = stats.getElo();
			eloBefore = delta != null ? stats.getElo() - delta : stats.getElo();
		}
		PlayerProgression progression = new PlayerProgression(scoringService.outcome(match.getMode(), score, rivalScore),
				xpGained, levelBefore, after.level(), after.xpIntoLevel(), after.xpForLevel(), eloBefore, eloAfter);
		return Optional.of(new MatchResult(match.getId(), match.getMode(), category.getSlug(), score, rivalScore,
				rivalCard(match, isA), progression, review(matchId, userId, lang)));
	}

	private List<MatchAssembler.ReviewEntry> review(long matchId, String userId, DuelLang lang) {
		List<DuelMatchQuestion> slots = matchQuestions.findByMatchIdOrderByPositionAsc(matchId);
		Map<Long, DuelQuestion> byId = new HashMap<>();
		questions.findAllById(slots.stream().map(DuelMatchQuestion::getQuestionId).toList())
			.forEach(question -> byId.put(question.getId(), question));
		Map<Integer, DuelAnswer> byPosition = new HashMap<>();
		answers.findByMatchIdAndUserIdOrderByPositionAsc(matchId, userId)
			.forEach(answer -> byPosition.put(answer.getPosition(), answer));
		return MatchAssembler.storedReview(slots, byId, byPosition, lang);
	}

	/** The rival as they were before the match: their current Elo minus what this match changed. */
	private PlayerCard humanRivalCard(DuelMatch match, boolean isA) {
		PlayerCard current = persistence
			.loadPlayerSnapshot(isA ? match.getPlayerB() : match.getPlayerA(), match.getCategoryId())
			.card();
		Integer rivalDelta = isA ? match.getEloDeltaB() : match.getEloDeltaA();
		if (current.elo() == null || rivalDelta == null) {
			return current;
		}
		return new PlayerCard(current.name(), current.level(), current.elo() - rivalDelta, current.avatar(), false);
	}

	private PlayerCard rivalCard(DuelMatch match, boolean isA) {
		return switch (match.getMode()) {
			case BOT -> new PlayerCard(match.getBotName(), match.getBotLevel() != null ? match.getBotLevel() : 1, null, null,
					true);
			case HUMAN -> humanRivalCard(match, isA);
			case SOLO -> null;
		};
	}

}
