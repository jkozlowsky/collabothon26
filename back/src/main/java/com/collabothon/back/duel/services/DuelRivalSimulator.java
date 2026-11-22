package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Component;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;

import lombok.RequiredArgsConstructor;

/**
 * The simulated "human" rival: a demo account that answers each question a few seconds after the player and always
 * ends one point behind ({@code rivalScore = max(playerScore - 1, 0)}), so a good run is a narrow win.
 */
@Component
@RequiredArgsConstructor
public class DuelRivalSimulator implements RivalSnapshotProvider {

	static final String DEMO_ACCOUNT_PREFIX = "demo-";

	static final String FALLBACK_RIVAL = "demo-ola";

	private final AccountRepository accounts;

	private final DuelProperties properties;

	private final Clock clock;

	/** A random demo account other than the player. Runs in the caller's transaction. */
	String pickRival(String userId) {
		List<String> candidates = accounts.findByUserIdStartingWith(DEMO_ACCOUNT_PREFIX)
			.stream()
			.map(Account::getUserId)
			.filter(id -> !id.equals(userId))
			.toList();
		if (candidates.isEmpty()) {
			return FALLBACK_RIVAL;
		}
		return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
	}

	/**
	 * The rival's answer to the question the player just answered: correct only while the rival is more than one
	 * point behind, visible a random delay after the player's answer.
	 * @param before the player's progress before this answer
	 */
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

	@Override
	public boolean supports(DuelMatch match) {
		return !match.isLive();
	}

	/** What the player can see of the rival now; null in SOLO matches. */
	@Override
	public RivalSnapshotDto snapshot(DuelProgress progress) {
		if (!progress.match().hasRival()) {
			return null;
		}
		Instant now = clock.instant();
		List<Boolean> results = new ArrayList<>(Collections.nCopies(progress.questionCount(), null));
		int answered = 0;
		for (DuelAnswer answer : progress.answers()) {
			if (answer.isRivalAnsweredAt(now)) {
				results.set(answer.getPosition(), answer.getRivalCorrect());
				answered++;
			}
		}
		return new RivalSnapshotDto(answered, results);
	}

}
