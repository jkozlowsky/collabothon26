package com.collabothon.back.duel.live;

import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

/** {@link DuelTimers} on one daemon scheduler thread. */
@Slf4j
@Component
class ScheduledDuelTimers implements DuelTimers {

	private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(task -> {
		Thread thread = new Thread(task, "duel-live-timers");
		thread.setDaemon(true);
		return thread;
	});

	@Override
	public void schedule(Runnable task, Duration delay) {
		executor.schedule(() -> {
			try {
				task.run();
			}
			catch (RuntimeException e) {
				log.warn("Duel live timer task failed", e);
			}
		}, delay.toMillis(), TimeUnit.MILLISECONDS);
	}

	@PreDestroy
	void shutdown() {
		executor.shutdownNow();
	}

}
