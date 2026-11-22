package com.collabothon.back.duel.live;

import org.springframework.stereotype.Service;

import com.collabothon.back.duel.consts.DuelSocketConsts;
import com.collabothon.back.duel.services.DuelMatchService;

import lombok.RequiredArgsConstructor;

/** Tells the opponents of a player whose socket stays closed past the grace period. */
@Service
@RequiredArgsConstructor
public class DuelPresenceService {

	private final DuelLiveNotifier notifier;

	private final DuelMatchService matchService;

	private final DuelTimers timers;

	public void onDisconnected(String userId) {
		timers.schedule(() -> notifyIfStillGone(userId), DuelSocketConsts.DISCONNECT_GRACE);
	}

	private void notifyIfStillGone(String userId) {
		if (notifier.isConnected(userId)) {
			return;
		}
		matchService.unfinishedLiveMatches(userId)
			.forEach(rival -> notifier.send(rival.userId(), DuelSocketMessages.rivalLeft(rival.matchId())));
	}

}
