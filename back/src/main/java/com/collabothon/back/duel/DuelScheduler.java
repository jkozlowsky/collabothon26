package com.collabothon.back.duel;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ScheduledFuture;

import jakarta.annotation.PreDestroy;

import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

/**
 * Own thread pool for question timeouts, bot answers and queue ticks. It is a separate type so it cannot be mixed up
 * with the other {@code TaskScheduler} beans (the STOMP broker has one too), and it runs on the application clock.
 */
@Component
class DuelScheduler {

	private static final int POOL_SIZE = 4;

	private final ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

	DuelScheduler(Clock clock) {
		scheduler.setPoolSize(POOL_SIZE);
		scheduler.setThreadNamePrefix("duel-scheduler-");
		scheduler.setDaemon(true);
		scheduler.setRemoveOnCancelPolicy(true);
		scheduler.setWaitForTasksToCompleteOnShutdown(false);
		scheduler.setClock(clock);
		scheduler.initialize();
	}

	ScheduledFuture<?> schedule(Runnable task, Instant at) {
		return scheduler.schedule(task, at);
	}

	ScheduledFuture<?> scheduleAtFixedRate(Runnable task, Instant first, Duration period) {
		return scheduler.scheduleAtFixedRate(task, first, period);
	}

	@PreDestroy
	void shutdown() {
		scheduler.shutdown();
	}

}
