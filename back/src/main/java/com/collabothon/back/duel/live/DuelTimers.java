package com.collabothon.back.duel.live;

import java.time.Duration;

/** Runs a task once after a delay. A seam so tests can fire timeouts by hand with a movable clock. */
public interface DuelTimers {

	void schedule(Runnable task, Duration delay);

}
