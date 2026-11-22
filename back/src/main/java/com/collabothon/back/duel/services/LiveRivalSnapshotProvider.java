package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;

/** The rival of a live duel: every answer the opponent has saved is visible at once. */
@Component
public class LiveRivalSnapshotProvider implements RivalSnapshotProvider {

	@Override
	public boolean supports(DuelMatch match) {
		return match.isLive();
	}

	@Override
	public RivalSnapshotDto snapshot(DuelProgress progress) {
		List<Boolean> results = new ArrayList<>(Collections.nCopies(progress.questionCount(), null));
		for (DuelAnswer answer : progress.opponentAnswers()) {
			results.set(answer.getPosition(), answer.isCorrect());
		}
		return new RivalSnapshotDto(progress.opponentAnswers().size(), results);
	}

}
