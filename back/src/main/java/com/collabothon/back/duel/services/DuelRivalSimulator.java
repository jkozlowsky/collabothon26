package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Component;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.duel.demo.DuelDemoConsts;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;

import lombok.RequiredArgsConstructor;

/** The simulated rival: answers shortly after the player and always ends one point behind, so wins are narrow. */
@Component
@RequiredArgsConstructor
public class DuelRivalSimulator {

	private final AccountRepository accounts;

	private final DuelProperties properties;

	private final Clock clock;

	/** A random demo account other than the player. */
	String pickRival(String userId) {
		List<String> candidates = accounts.findByUserIdStartingWith(DuelDemoConsts.ACCOUNT_PREFIX)
			.stream()
			.map(Account::getUserId)
			.filter(id -> !id.equals(userId))
			.toList();
		if (candidates.isEmpty()) {
			return DuelDemoConsts.FALLBACK_RIVAL;
		}
		return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
	}

	/** Takes the progress from before this answer: the rival is correct only while more than one point behind. */
	RivalAnswer answer(DuelProgress before, boolean playerCorrect, Instant playerAnsweredAt) {
		int playerScore = before.score();
		if (playerCorrect) {
			playerScore++;
		}
		boolean correct = before.rivalScore() < Math.max(playerScore - 1, 0);
		long delayMs = ThreadLocalRandom.current()
			.nextLong(properties.botMinDelayMs(), properties.botMaxDelayMs() + 1);
		return new RivalAnswer(correct, playerAnsweredAt.plusMillis(delayMs));
	}

	/** The answers whose time has come; null in SOLO matches. */
	RivalSnapshotDto snapshot(DuelProgress progress) {
		if (!progress.getMatch().hasRival()) {
			return null;
		}
		Instant now = clock.instant();
		List<DuelAnswer> visible = progress.getAnswers().stream()
			.filter(answer -> answer.isRivalAnsweredAt(now))
			.toList();
		return new RivalSnapshotDto(visible.size(), progress.resultsPerQuestion(visible, DuelAnswer::getRivalCorrect));
	}

}
