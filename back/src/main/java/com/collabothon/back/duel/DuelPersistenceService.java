package com.collabothon.back.duel;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.random.RandomGenerator;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.exceptions.BadRequestException;
import com.collabothon.back.common.exceptions.NotFoundException;
import com.collabothon.back.duel.LevelCurve.LevelInfo;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** The transactional boundary of a match: creating it, logging answers and settling XP and Elo at the end. */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class DuelPersistenceService {

	private static final int RECENT_MATCH_WINDOW = 3;

	private static final int RIVAL_CANDIDATES = 3;

	private final DuelCategoryRepository categories;

	private final DuelQuestionRepository questions;

	private final DuelAccountRepository accounts;

	private final DuelMatchRepository matches;

	private final DuelMatchQuestionRepository matchQuestions;

	private final DuelAnswerRepository answers;

	private final DuelProgressRepository progress;

	private final LevelCurve levelCurve;

	private final EloService eloService;

	private final ScoringService scoringService;

	private final QuestionSelectionService questionSelection;

	@Transactional(readOnly = true)
	public DuelCategory requireCategory(String slug) {
		return categories.findBySlug(slug).orElseThrow(() -> new BadRequestException("Unknown category: " + slug));
	}

	/** A player's card, XP, Elo and human-match count in one category; unknown players start fresh. */
	@Transactional(readOnly = true)
	public PlayerSnapshot loadPlayerSnapshot(String userId, Long categoryId) {
		DuelAccount account = accounts.findById(userId).orElse(null);
		String name = account != null ? account.getFirstName() : userId;
		String avatar = account != null ? account.getAvatar() : DuelAccount.DEFAULT_AVATAR;
		DuelProgress stats = progress.findById(new DuelProgress.Key(userId, categoryId))
			.orElseGet(() -> new DuelProgress(userId, categoryId));
		int level = levelCurve.fromXp(stats.getXp()).level();
		return new PlayerSnapshot(new PlayerCard(name, level, stats.getElo(), avatar, false), stats.getElo());
	}

	/** The mocked human rival: a duel player in the category whose Elo is closest to {@code elo}, never the caller. */
	@Transactional(readOnly = true)
	public Optional<String> pickRival(Long categoryId, String userId, int elo, RandomGenerator rng) {
		List<DuelProgress> closest = progress.findClosestByElo(categoryId, userId, elo,
				PageRequest.of(0, RIVAL_CANDIDATES));
		return closest.isEmpty() ? Optional.empty()
				: Optional.of(closest.get(rng.nextInt(closest.size())).getUserId());
	}

	/** Picks the match questions, preferring ones none of the players saw in their last three matches. */
	@Transactional(readOnly = true)
	public List<SelectedQuestion> selectQuestions(Long categoryId, int effectiveLevel, List<String> userIds,
			RandomGenerator rng) {
		List<DuelQuestion> pool = questions.findByCategoryId(categoryId);
		Set<Long> recentMatchIds = new HashSet<>();
		for (String userId : userIds) {
			recentMatchIds
				.addAll(matches.findRecentMatchIds(categoryId, userId, PageRequest.of(0, RECENT_MATCH_WINDOW)));
		}
		Set<Long> recentlySeen = new HashSet<>();
		if (!recentMatchIds.isEmpty()) {
			matchQuestions.findByMatchIdIn(recentMatchIds).forEach(slot -> recentlySeen.add(slot.getQuestionId()));
		}
		return questionSelection.select(pool, effectiveLevel, recentlySeen, rng);
	}

	@Transactional
	public DuelMatch createMatch(DuelMatch match, List<SelectedQuestion> selected) {
		DuelMatch saved = matches.save(match);
		List<DuelMatchQuestion> slots = new ArrayList<>(selected.size());
		for (int i = 0; i < selected.size(); i++) {
			SelectedQuestion question = selected.get(i);
			slots.add(new DuelMatchQuestion(saved.getId(), i, question.question().getId(), question.optionOrder()));
		}
		matchQuestions.saveAll(slots);
		return saved;
	}

	@Transactional
	public void saveAnswer(DuelAnswer answer) {
		answers.save(answer);
	}

	/** Settles a finished match: XP for everyone, Elo only between two humans. An abandoned match changes nothing. */
	@Transactional
	public MatchCompletion completeMatch(long matchId, int scoreA, Integer scoreB, boolean abandoned, Instant endedAt) {
		DuelMatch match = matches.findById(matchId).orElseThrow(() -> new NotFoundException("Match not found: " + matchId));
		if (abandoned) {
			match.abandon(scoreA, scoreB, endedAt);
			return new MatchCompletion(null, null);
		}
		DuelMode mode = match.getMode();
		MatchOutcome outcomeA = scoringService.outcome(mode, scoreA, scoreB);
		int xpA = scoringService.xpGained(mode, scoreA, outcomeA);
		DuelProgress statsA = statsOf(match.getPlayerA(), match.getCategoryId());

		if (mode != DuelMode.HUMAN) {
			PlayerProgression resultA = apply(statsA, outcomeA, xpA, null);
			progress.save(statsA);
			match.finish(scoreA, scoreB, xpA, null, null, null, endedAt);
			return new MatchCompletion(resultA, null);
		}
		MatchOutcome outcomeB = scoringService.outcome(mode, scoreB, scoreA);
		int xpB = scoringService.xpGained(mode, scoreB, outcomeB);
		DuelProgress statsB = statsOf(match.getPlayerB(), match.getCategoryId());
		int eloDeltaA = eloService.delta(statsA.getElo(), statsB.getElo(), statsA.getHumanMatches(), outcomeA);
		int eloDeltaB = eloService.delta(statsB.getElo(), statsA.getElo(), statsB.getHumanMatches(), outcomeB);
		PlayerProgression resultA = apply(statsA, outcomeA, xpA, eloDeltaA);
		PlayerProgression resultB = apply(statsB, outcomeB, xpB, eloDeltaB);
		progress.save(statsA);
		progress.save(statsB);
		match.finish(scoreA, scoreB, xpA, xpB, eloDeltaA, eloDeltaB, endedAt);
		return new MatchCompletion(resultA, resultB);
	}

	private DuelProgress statsOf(String userId, Long categoryId) {
		return progress.findById(new DuelProgress.Key(userId, categoryId))
			.orElseGet(() -> new DuelProgress(userId, categoryId));
	}

	/** {@code eloDelta} is null for bot and solo matches, which neither move Elo nor count as human matches. */
	private PlayerProgression apply(DuelProgress stats, MatchOutcome outcome, int xpGained, Integer eloDelta) {
		boolean human = eloDelta != null;
		int levelBefore = levelCurve.fromXp(stats.getXp()).level();
		Integer eloBefore = human ? stats.getElo() : null;
		stats.applyMatch(xpGained, eloDelta, human);
		LevelInfo after = levelCurve.fromXp(stats.getXp());
		return new PlayerProgression(outcome, xpGained, levelBefore, after.level(), after.xpIntoLevel(),
				after.xpForLevel(), eloBefore, human ? stats.getElo() : null);
	}

	record PlayerSnapshot(PlayerCard card, int elo) {
	}

	record PlayerProgression(MatchOutcome outcome, int xpGained, int levelBefore, int levelAfter, int xpIntoLevel,
			int xpForLevel, Integer eloBefore, Integer eloAfter) {
	}

	/** {@code playerA} and {@code playerB} are null when the match was abandoned or has no second human. */
	record MatchCompletion(PlayerProgression playerA, PlayerProgression playerB) {

		boolean abandoned() {
			return playerA == null;
		}

	}

}
