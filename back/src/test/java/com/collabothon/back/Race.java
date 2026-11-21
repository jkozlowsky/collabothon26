package com.collabothon.back;

import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.springframework.transaction.support.TransactionTemplate;

/** A double tap: the second call runs while the first one's transaction is still open. */
public final class Race {

	// Long enough for the second call to reach its write and wait on the first one's row lock.
	private static final Duration OVERLAP = Duration.ofMillis(500);

	private static final long TIMEOUT_SECONDS = 10;

	private Race() {
	}

	public static <T> T secondDuringFirst(TransactionTemplate tx, Callable<?> first, Callable<T> second)
			throws Exception {
		ExecutorService other = Executors.newSingleThreadExecutor();
		try {
			Future<T> result = tx.execute(status -> {
				call(first);
				Future<T> started = other.submit(() -> tx.execute(s -> call(second)));
				pause();
				return started;
			});
			return result.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
		}
		finally {
			other.shutdownNow();
		}
	}

	private static <T> T call(Callable<T> callable) {
		try {
			return callable.call();
		}
		catch (Exception e) {
			throw new IllegalStateException(e);
		}
	}

	private static void pause() {
		try {
			Thread.sleep(OVERLAP);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException(e);
		}
	}

}
