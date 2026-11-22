package com.collabothon.back.duel.services;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.duel.MatchSummaryDto;
import com.collabothon.back.dto.duel.MatchSummaryStatus;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelMatch;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DuelHistoryService {

	private final DuelMatchRepository matches;

	private final DuelProgressLoader progressLoader;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchMapper matchMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<MatchSummaryDto> history(String userId) {
		List<DuelMatch> history = matches.findHistory(userId, Limit.of(DuelConsts.HISTORY_LIMIT));
		Map<String, PlayerCardDto> rivalCards = new HashMap<>();
		return progressLoader.loadPlayerOnly(history).stream().map(progress -> summary(progress, rivalCards)).toList();
	}

	private MatchSummaryDto summary(DuelProgress progress, Map<String, PlayerCardDto> rivalCards) {
		DuelMatch match = progress.getMatch();
		PlayerCardDto rival = null;
		String rivalUserId = match.getRivalUserId();
		if (rivalUserId != null) {
			rival = rivalCards.computeIfAbsent(rivalUserId, playerCards::card);
		}
		return matchMapper.toSummaryDto(match, rival, status(progress), progress.score());
	}

	private static MatchSummaryStatus status(DuelProgress progress) {
		if (progress.getMatch().isFinished()) {
			return MatchSummaryStatus.FINISHED;
		}
		if (!progress.isComplete()) {
			return MatchSummaryStatus.PLAYING;
		}
		return MatchSummaryStatus.RIVAL_PLAYING;
	}

}
