package com.collabothon.back.duel.services;

import org.springframework.stereotype.Component;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.entities.duel.DuelMatch;

import lombok.RequiredArgsConstructor;

/** Loads a match with the player's answers and, in a live duel, the opponent's. Runs in the caller's transaction. */
@Component
@RequiredArgsConstructor
public class DuelProgressLoader {

	private final DuelAnswerRepository answers;

	private final DuelProperties properties;

	public DuelProgress load(DuelMatch match) {
		int questionCount = properties.questionsPerMatch();
		var own = answers.findByMatchIdOrderByPositionAsc(match.getId());
		if (!match.isLive()) {
			return new DuelProgress(match, own, questionCount);
		}
		return new DuelProgress(match, own, questionCount, answers.findByMatchIdOrderByPositionAsc(match.getOpponentMatchId()));
	}

}
