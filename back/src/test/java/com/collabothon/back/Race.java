package com.collabothon.back;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.springframework.transaction.ConfigurableTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** A double tap: the second call runs while the first one's transaction is still open. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class Race {

	// Long enough for the second call to reach its write and wait on the first one's row lock.
	private static final Duration OVERLAP = Duration.ofMillis(500);

	private static final long TIMEOUT_SECONDS = 10;

	public static <T> T secondDuringFirst(TransactionTemplate tx, Callable<?> first, Callable<T> second)
			throws Exception {
		ExecutorService other = Executors.newSingleThreadExecutor();
		ConfigurableTransactionManager manager = (ConfigurableTransactionManager) tx.getTransactionManager();
		List<Future<T>> started = new ArrayList<>();
		// The services commit on their own, so the overlap is inside the first call, just before its write commits.
		CommitHook hook = new CommitHook(() -> {
			started.add(other.submit(second));
			pause();
		});
		manager.addListener(hook);
		try {
			first.call();
			return started.getFirst().get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
		}
		finally {
			manager.getTransactionExecutionListeners().remove(hook);
			other.shutdownNow();
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
