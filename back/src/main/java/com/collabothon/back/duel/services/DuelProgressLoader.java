package com.collabothon.back.duel.services;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.exceptions.BusinessException;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DuelProgressLoader {

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelProperties properties;

	DuelMatch findMatch(long matchId, String userId) {
		return matches.findByIdAndUserId(matchId, userId)
			.orElseThrow(() -> new BusinessException(DuelErrorCode.MATCH_NOT_FOUND, String.valueOf(matchId)));
	}

	DuelProgress newMatch(DuelMatch match) {
		return new DuelProgress(match, List.of(), properties.questionsPerMatch());
	}

	DuelProgress load(DuelMatch match) {
		List<DuelAnswer> own = answers.findByMatchIdOrderByPositionAsc(match.getId());
		if (!match.isLive()) {
			return new DuelProgress(match, own, properties.questionsPerMatch());
		}
		return new DuelProgress(match, own, properties.questionsPerMatch(),
				answers.findByMatchIdOrderByPositionAsc(match.getOpponentMatchId()));
	}

	/** In one query, without the opponents' answers: for the player's own counts only. */
	List<DuelProgress> loadPlayerOnly(List<DuelMatch> playerMatches) {
		Map<Long, List<DuelAnswer>> answersByMatch = answers
			.findByMatchIdInOrderByPosition(playerMatches.stream().map(DuelMatch::getId).toList())
			.stream()
			.collect(Collectors.groupingBy(DuelAnswer::getMatchId));
		return playerMatches.stream()
			.map(match -> new DuelProgress(match, answersByMatch.getOrDefault(match.getId(), List.of()),
					properties.questionsPerMatch()))
			.toList();
	}

}
