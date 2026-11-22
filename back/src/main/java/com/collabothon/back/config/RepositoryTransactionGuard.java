package com.collabothon.back.config;

import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionSynchronizationManager;

// MANDATORY on a repository interface skips the inherited CrudRepository methods: Spring Data reads theirs instead.
@Aspect
@Component
class RepositoryTransactionGuard {

	@Before("execution(* org.springframework.data.repository.Repository+.*(..))")
	void requireTransaction() {
		if (!TransactionSynchronizationManager.isActualTransactionActive()) {
			throw new IllegalTransactionStateException("Repository call outside a transaction");
		}
	}

}
