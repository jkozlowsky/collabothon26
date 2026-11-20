package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.ScheduledFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.collabothon.back.common.BadRequestException;
import com.collabothon.back.duel.DuelMessage.QueueWaiting;
import com.collabothon.back.duel.DuelPersistenceService.PlayerSnapshot;
import com.collabothon.back.duel.MatchService.MatchedPlayer;

@ExtendWith(MockitoExtension.class)
class MatchmakingServiceTest {

	private static final DuelProperties DEFAULTS = new DuelProperties(6, 40_000L, 5, 10, 1_000L, 150, 8_000L, 30_000L);

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-18T12:00:00Z"), ZoneOffset.UTC);

	@Mock
	private DuelPersistenceService persistence;
	@Mock
	private MatchService matchService;
	@Mock
	private DuelSessionTracker sessionTracker;
	@Mock
	private DuelMessagePublisher publisher;
	@Mock
	private DuelScheduler scheduler;

	private MatchmakingService matchmakingService;
	private DuelCategory instruments;

	@BeforeEach
	void setUp() {
		matchmakingService = new MatchmakingService(persistence, matchService, sessionTracker, publisher,
				DEFAULTS, scheduler, CLOCK);
		instruments = mock(DuelCategory.class);
	}

	@Test
	void soloAndBotModesStartImmediately() {
		when(persistence.requireCategory("instruments")).thenReturn(instruments);

		matchmakingService.joinQueue("s1", "alice", DuelLang.EN, "instruments", DuelMode.SOLO);
		verify(matchService).startSoloMatch("s1", "alice", DuelLang.EN, instruments);

		matchmakingService.joinQueue("s2", "bob", DuelLang.PL, "instruments", DuelMode.BOT);
		verify(matchService).startBotMatch("s2", "bob", DuelLang.PL, instruments);
	}

	@Test
	void humanModeMatchesImmediatelyWithinEloWindow() {
		when(instruments.getId()).thenReturn(1L);
		when(instruments.getSlug()).thenReturn("instruments");
		when(persistence.requireCategory("instruments")).thenReturn(instruments);
		when(persistence.loadPlayerSnapshot("alice", 1L))
			.thenReturn(new PlayerSnapshot(new PlayerCard("Alice", 5, 1100, 1, false), 1100));
		when(persistence.loadPlayerSnapshot("bob", 1L))
			.thenReturn(new PlayerSnapshot(new PlayerCard("Bob", 6, 1200, 2, false), 1200));
		when(sessionTracker.isOpen("s1")).thenReturn(true);
		when(scheduler.scheduleAtFixedRate(any(Runnable.class), any(Instant.class), any(Duration.class)))
			.thenReturn(mock(ScheduledFuture.class));

		matchmakingService.joinQueue("s1", "alice", DuelLang.EN, "instruments", DuelMode.HUMAN);
		verify(publisher).sendToUser("alice", new QueueWaiting(0, false));

		matchmakingService.joinQueue("s2", "bob", DuelLang.PL, "instruments", DuelMode.HUMAN);
		verify(matchService).startHumanMatch(new MatchedPlayer("s1", "alice", DuelLang.EN),
				new MatchedPlayer("s2", "bob", DuelLang.PL), instruments);
	}

	@Test
	void humanModeDoesNotMatchImmediatelyWhenOutsideEloWindow() {
		when(instruments.getId()).thenReturn(1L);
		when(instruments.getSlug()).thenReturn("instruments");
		when(persistence.requireCategory("instruments")).thenReturn(instruments);
		when(persistence.loadPlayerSnapshot("alice", 1L))
			.thenReturn(new PlayerSnapshot(new PlayerCard("Alice", 5, 1000, 1, false), 1000));
		when(persistence.loadPlayerSnapshot("bob", 1L))
			.thenReturn(new PlayerSnapshot(new PlayerCard("Bob", 6, 1300, 2, false), 1300));
		when(sessionTracker.isOpen("s1")).thenReturn(true);
		when(scheduler.scheduleAtFixedRate(any(Runnable.class), any(Instant.class), any(Duration.class)))
			.thenReturn(mock(ScheduledFuture.class));

		matchmakingService.joinQueue("s1", "alice", DuelLang.EN, "instruments", DuelMode.HUMAN);
		matchmakingService.joinQueue("s2", "bob", DuelLang.EN, "instruments", DuelMode.HUMAN);

		verify(matchService, never()).startHumanMatch(any(), any(), any());
	}

	@Test
	void acceptBotTransitionsQueuedPlayerAndRejectsNonQueued() {
		assertThatThrownBy(() -> matchmakingService.acceptBot("s-missing", "alice", DuelLang.EN))
			.isInstanceOf(BadRequestException.class);

		when(instruments.getId()).thenReturn(1L);
		when(instruments.getSlug()).thenReturn("instruments");
		when(persistence.requireCategory("instruments")).thenReturn(instruments);
		when(persistence.loadPlayerSnapshot("alice", 1L))
			.thenReturn(new PlayerSnapshot(new PlayerCard("Alice", 5, 1000, 1, false), 1000));
		when(scheduler.scheduleAtFixedRate(any(Runnable.class), any(Instant.class), any(Duration.class)))
			.thenReturn(mock(ScheduledFuture.class));

		matchmakingService.joinQueue("s1", "alice", DuelLang.EN, "instruments", DuelMode.HUMAN);
		matchmakingService.acceptBot("s1", "alice", DuelLang.EN);

		verify(matchService).startBotMatch(eq("s1"), eq("alice"), eq(DuelLang.EN), eq(instruments));
	}

	@Test
	void unknownCategoryThrowsInvalidCategoryException() {
		when(persistence.requireCategory("unknown")).thenThrow(new BadRequestException("Unknown category: unknown"));

		assertThatThrownBy(() -> matchmakingService.joinQueue("s1", "alice", DuelLang.EN, "unknown", DuelMode.SOLO))
			.isInstanceOf(BadRequestException.class);
	}

}
