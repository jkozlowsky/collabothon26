package com.collabothon.back.xp.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.entities.xp.XpSource;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class XpServiceTransactionTests {

	private static final String USER = "xp-rollback";

	@Autowired
	TransactionTemplate tx;

	@Autowired
	XpService xpService;

	@Test
	void xpRollsBackWithTheTransactionThatEarnedIt() {
		Instant at = Instant.parse("2026-11-21T10:00:00Z");

		tx.executeWithoutResult(status -> {
			xpService.record(USER, "saving", XpSource.DUEL, "1", 5, at);
			xpService.awardLesson(USER, "berlin-1", "berlin", 50, at);
			status.setRollbackOnly();
		});

		assertThat(xpService.totalXp(USER)).isZero();
	}

}
