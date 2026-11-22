package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.duel.demo.DuelDemoConsts;
import com.collabothon.back.entities.duel.AnswerOutcome;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;

class DuelRivalSimulatorTests {

	private static final int QUESTIONS = 6;

	private static final Instant START = Instant.parse("2026-11-23T10:00:00Z");

	private static final long ANSWER_GAP_MS = 5000;

	private final AccountRepository accounts = mock(AccountRepository.class);

	private final DuelRivalSimulator simulator = new DuelRivalSimulator(accounts, DuelTestFixtures.PROPERTIES,
			Clock.fixed(START, ZoneOffset.UTC));

	@Test
	void rivalEndsOnePointBehindForEveryAnswerPattern() {
		for (int pattern = 0; pattern < (1 << QUESTIONS); pattern++) {
			DuelProgress progress = new DuelProgress(humanMatch(), List.of(), QUESTIONS);
			for (int k = 0; k < QUESTIONS; k++) {
				boolean correct = ((pattern >> k) & 1) == 1;
				Instant answeredAt = START.plusMillis(k * ANSWER_GAP_MS);

				RivalAnswer rival = simulator.answer(progress, correct, answeredAt);

				assertThat(rival.visibleAt()).isBetween(answeredAt.plusMillis(1000), answeredAt.plusMillis(4000));
				progress.add(answer(k, correct, rival.correct(), rival.visibleAt()));
				assertThat(progress.rivalScore()).isEqualTo(Math.max(progress.score() - 1, 0));
			}
		}
	}

	@Test
	void snapshotShowsOnlyRivalAnswersWhoseTimeHasCome() {
		DuelProgress progress = new DuelProgress(humanMatch(), List.of(answer(0, true, true, START.minusMillis(1)),
				answer(1, true, false, START), answer(2, true, true, START.plusMillis(1))), QUESTIONS);

		RivalSnapshotDto snapshot = simulator.snapshot(progress);

		assertThat(snapshot.answered()).isEqualTo(2);
		assertThat(snapshot.results()).containsExactly(true, false, null, null, null, null);
	}

	@Test
	void soloMatchHasNoRivalSnapshot() {
		DuelMatch solo = DuelMatch.start(DuelMode.SOLO, List.of("berlin"), "player", null, START);

		assertThat(simulator.snapshot(new DuelProgress(solo, List.of(), QUESTIONS))).isNull();
	}

	@Test
	void rivalIsADemoAccountOtherThanThePlayer() {
		when(accounts.findByUserIdStartingWith("demo-")).thenReturn(List.of(account("demo-user"), account("demo-ola")));

		assertThat(simulator.pickRival("demo-user")).isEqualTo("demo-ola");
	}

	@Test
	void rivalFallsBackWhenThereAreNoOtherDemoAccounts() {
		when(accounts.findByUserIdStartingWith("demo-")).thenReturn(List.of(account("demo-user")));

		assertThat(simulator.pickRival("demo-user")).isEqualTo(DuelDemoConsts.FALLBACK_RIVAL);
	}

	private static DuelMatch humanMatch() {
		return DuelMatch.start(DuelMode.HUMAN, List.of("berlin"), "player", "demo-ola", START);
	}

	private static DuelAnswer answer(int position, boolean correct, boolean rivalCorrect, Instant rivalAt) {
		return DuelAnswer.builder()
			.position(position)
			.questionId("q" + position)
			.category("berlin")
			.correct(correct)
			.outcome(AnswerOutcome.ANSWERED)
			.rivalCorrect(rivalCorrect)
			.rivalAnswerAt(rivalAt)
			.createdAt(START)
			.build();
	}

	private static Account account(String userId) {
		return Account.builder().userId(userId).firstName(userId).lastName("Test").avatar("m1").build();
	}

}
