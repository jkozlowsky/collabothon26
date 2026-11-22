package com.collabothon.back.duel.live;

import java.time.Duration;

import org.springframework.stereotype.Service;

import com.collabothon.back.duel.services.DuelMatchService;

import lombok.RequiredArgsConstructor;

/** Tells the opponent of a live duel when a player's socket stays closed for {@link #GRACE}. */
@Service
@RequiredArgsConstructor
public class DuelPresenceService {

	public static final Duration GRACE = Duration.ofSeconds(10);

	private final DuelLiveNotifier notifier;

	private final DuelMatchService matchService;

	private final DuelTimers timers;

	public void onDisconnected(String userId) {
		timers.schedule(() -> notifyIfStillGone(userId), GRACE);
	}

	void notifyIfStillGone(String userId) {
		if (notifier.isConnected(userId)) {
			return;
		}
		matchService.unfinishedLiveMatches(userId)
			.forEach(rival -> notifier.send(rival.userId(), DuelSocketMessages.rivalLeft(rival.matchId())));
	}

}
