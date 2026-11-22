package com.collabothon.back.duel.live;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Primary;

/** Timers that fire only when a test says so, so the movable clock decides what has timed out. */
// No @Component: spring-boot:test-run scans the test classes and must keep the real timers.
@Primary
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
