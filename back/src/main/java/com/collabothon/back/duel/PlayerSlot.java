package com.collabothon.back.duel;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ScheduledFuture;

import lombok.Getter;
import lombok.Setter;

/**
 * Mutable per-player progress inside an {@link ActiveMatch}.
 *
 * <p>Thread-safety: all reads and writes MUST occur while holding the owning
 * {@link ActiveMatch}'s lock.
 */
@Getter
@Setter
final class PlayerSlot {

	private final String userId;

	private final boolean bot;

	private final int botLevel;

	private final PlayerCard card;

	private final Boolean[] results;

	private final Integer[] chosenDisplayOptions;

	private String sessionId;

	private DuelLang lang;

	private boolean connected;

	private int currentIndex;

	private int answered;

	private int score;

	private boolean finished;

	private long questionStartedAt;

	private long questionDeadline;

	private ScheduledFuture<?> timerFuture;

	private PlayerSlot(String userId, boolean bot, int botLevel, PlayerCard card, String sessionId, DuelLang lang,
			boolean connected, int questionCount) {
		this.userId = userId;
		this.bot = bot;
		this.botLevel = botLevel;
		this.card = card;
		this.sessionId = sessionId;
		this.lang = lang;
		this.connected = connected;
		this.results = new Boolean[questionCount];
		this.chosenDisplayOptions = new Integer[questionCount];
	}

	static PlayerSlot human(String sessionId, String userId, DuelLang lang, PlayerCard card, int questionCount) {
		return new PlayerSlot(userId, false, 0, card, sessionId, lang, true, questionCount);
	}

	static PlayerSlot bot(String botUserId, int botLevel, PlayerCard card, int questionCount) {
		return new PlayerSlot(botUserId, true, botLevel, card, null, DuelLang.EN, true, questionCount);
	}

	List<Boolean> resultsCopy() {
		return new ArrayList<>(Arrays.asList(results));
	}

	void recordAnswer(int index, boolean correct, Integer displayOption) {
		results[index] = correct;
		chosenDisplayOptions[index] = displayOption;
		answered++;
		if (correct) {
			score++;
		}
		currentIndex++;
	}

	void cancelTimer() {
		if (timerFuture != null) {
			timerFuture.cancel(false);
			timerFuture = null;
		}
	}

}
