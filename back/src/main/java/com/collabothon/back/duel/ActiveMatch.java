package com.collabothon.back.duel;

import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.Getter;

/**
 * In-memory state for a single live duel match.
 *
 * <p>Thread-safety: every mutable field on this instance and its {@link PlayerSlot}s is
 * guarded by the per-match {@link #lock}. Callers must acquire {@link #lock} around state
 * transitions and release it BEFORE performing STOMP network sends so slow clients cannot
 * stall timers or concurrent match updates.
 */
@Getter
final class ActiveMatch {

	private final ReentrantLock lock = new ReentrantLock();

	private final long matchId;

	private final DuelMode mode;

	private final DuelCategory category;

	private final List<SelectedQuestion> questions;

	private final PlayerSlot slotA;

	private final PlayerSlot slotB;

	private boolean ended;

	ActiveMatch(long matchId, DuelMode mode, DuelCategory category, List<SelectedQuestion> questions, PlayerSlot slotA,
			PlayerSlot slotB) {
		this.matchId = matchId;
		this.mode = mode;
		this.category = category;
		this.questions = List.copyOf(questions);
		this.slotA = slotA;
		this.slotB = slotB;
	}

	PlayerSlot findHumanSlot(String userId) {
		if (slotA.getUserId().equals(userId)) {
			return slotA;
		}
		if (slotB != null && !slotB.isBot() && slotB.getUserId().equals(userId)) {
			return slotB;
		}
		return null;
	}

	PlayerSlot rivalOf(PlayerSlot slot) {
		return slot == slotA ? slotB : slotA;
	}

	boolean isComplete() {
		if (mode == DuelMode.SOLO) {
			return slotA.isFinished();
		}
		return slotA.isFinished() && slotB != null && slotB.isFinished();
	}

	boolean hasAnyConnectedHuman() {
		return slotA.isConnected() || (mode == DuelMode.HUMAN && slotB != null && slotB.isConnected());
	}

	void markEndedAndCancelTimers() {
		this.ended = true;
		slotA.cancelTimer();
		if (slotB != null) {
			slotB.cancelTimer();
		}
	}

}
