package com.collabothon.back.config;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.IllegalTransactionStateException;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RepositoryTransactionTests {

	@Autowired
	AccountRepository accounts;

	@Test
	void inheritedRepositoryMethodsNeedATransaction() {
		Account account = Account.builder().userId("no-tx").firstName("No").lastName("Tx").avatar("m1").build();

		assertThatExceptionOfType(IllegalTransactionStateException.class).isThrownBy(() -> accounts.findById("no-tx"));
		assertThatExceptionOfType(IllegalTransactionStateException.class).isThrownBy(() -> accounts.save(account));
		assertThatExceptionOfType(IllegalTransactionStateException.class).isThrownBy(() -> accounts.deleteById("no-tx"));
	}

}
