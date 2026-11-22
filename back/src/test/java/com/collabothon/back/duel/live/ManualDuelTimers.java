package com.collabothon.back.duel.live;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Timers that fire only when a test says so, so the movable clock decides what has timed out. */
class ManualDuelTimers implements DuelTimers {

	private final List<Runnable> tasks = new ArrayList<>();

	@Override
	public synchronized void schedule(Runnable task, Duration delay) {
		tasks.add(task);
	}

	synchronized void runAll() {
		List<Runnable> due = new ArrayList<>(tasks);
		tasks.clear();
		due.forEach(Runnable::run);
	}

}
