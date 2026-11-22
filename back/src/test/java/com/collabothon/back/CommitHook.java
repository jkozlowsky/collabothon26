package com.collabothon.back;

import org.springframework.transaction.TransactionExecution;
import org.springframework.transaction.TransactionExecutionListener;

import lombok.RequiredArgsConstructor;

/** Runs an action once, just before this thread's first write transaction commits. */
@RequiredArgsConstructor
final class CommitHook implements TransactionExecutionListener {

	private final Runnable action;

	private final Thread thread = Thread.currentThread();

	private boolean done;

	@Override
	public void beforeCommit(TransactionExecution transaction) {
		if (Thread.currentThread() != thread || done || transaction.isReadOnly()) {
			return;
		}
		done = true;
		action.run();
	}

}
