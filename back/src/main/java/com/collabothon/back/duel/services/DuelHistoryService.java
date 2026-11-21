package com.collabothon.back.duel.services;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.duel.MatchSummaryDto;
import com.collabothon.back.dto.duel.MatchSummaryStatus;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;

import lombok.RequiredArgsConstructor;

/** The "Historia" tab: the player's matches, unfinished first, then finished newest first. */
@Service
@RequiredArgsConstructor
public class DuelHistoryService {

	static final int HISTORY_LIMIT = 50;

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchMapper matchMapper;

	private final DuelProperties properties;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<MatchSummaryDto> history(String userId) {
		List<DuelMatch> history = matches.findHistory(userId, Limit.of(HISTORY_LIMIT));
		Map<Long, List<DuelAnswer>> answersByMatch = answers
			.findByMatchIdInOrderByPosition(history.stream().map(DuelMatch::getId).toList())
			.stream()
			.collect(Collectors.groupingBy(DuelAnswer::getMatchId));
		Map<String, PlayerCardDto> rivalCards = new HashMap<>();
		return history.stream()
			.map(match -> summary(match, answersByMatch.getOrDefault(match.getId(), List.of()), rivalCards))
			.toList();
	}

	private MatchSummaryDto summary(DuelMatch match, List<DuelAnswer> matchAnswers,
			Map<String, PlayerCardDto> rivalCards) {
		DuelProgress progress = new DuelProgress(match, matchAnswers, properties.questionsPerMatch());
		PlayerCardDto rival = null;
		if (match.getRivalUserId() != null) {
			rival = rivalCards.computeIfAbsent(match.getRivalUserId(), playerCards::card);
		}
		return matchMapper.toSummaryDto(match, rival, status(progress), progress.score());
	}

	private static MatchSummaryStatus status(DuelProgress progress) {
		if (progress.match().isFinished()) {
			return MatchSummaryStatus.FINISHED;
		}
		if (!progress.isComplete()) {
			return MatchSummaryStatus.PLAYING;
		}
		return MatchSummaryStatus.RIVAL_PLAYING;
	}

}
