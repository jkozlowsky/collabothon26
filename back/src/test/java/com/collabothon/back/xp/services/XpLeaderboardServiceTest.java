package com.collabothon.back.xp.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.collabothon.back.entities.xp.XpEvent;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.xp.repositories.XpEventRepository;

@ExtendWith(MockitoExtension.class)
class XpLeaderboardServiceTest {

	@Mock
	XpEventRepository xpEvents;

	@Mock
	XpWeekCalculator weekCalculator;

	XpLeaderboardService service;

	private static final Instant WEEK_START = Instant.parse("2026-11-22T23:00:00Z");
	private static final Instant WEEK_END = Instant.parse("2026-11-29T23:00:00Z");
	private static final Instant IN_WEEK = WEEK_START.plusSeconds(3600);
	private static final WeekWindow WEEK = new WeekWindow(WEEK_START, WEEK_END);

	@BeforeEach
	void setUp() {
		service = new XpLeaderboardService(xpEvents, weekCalculator);
	}

	@Test
	void matchWithXpInTwoCategoriesMovesUserFromRank6To5() {
		String userId = "user1";
		when(weekCalculator.currentWeek()).thenReturn(WEEK);
		// Currently user has 50 weekly XP, which puts them at rank 5 (4 users above them)
		when(xpEvents.sumXpByUserIdBetween(userId, WEEK_START, WEEK_END)).thenReturn(50L);
		when(xpEvents.countUsersRankedAbove(userId, 50L, WEEK_START, WEEK_END)).thenReturn(4L);

		// Latest award group is a duel match (#99) that awarded XP in 2 categories: berlin (+10) and tokyo (+10)
		XpEvent event1 = XpEvent.builder()
			.id(101L)
			.userId(userId)
			.category("berlin")
			.source(XpSource.DUEL)
			.sourceRef("match-99")
			.xp(10)
			.createdAt(IN_WEEK)
			.build();
		XpEvent event2 = XpEvent.builder()
			.id(102L)
			.userId(userId)
			.category("tokyo")
			.source(XpSource.DUEL)
			.sourceRef("match-99")
			.xp(10)
			.createdAt(IN_WEEK)
			.build();

		// findTop returns event2 (id 102)
		when(xpEvents.findTopByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdDesc(userId, WEEK_START, WEEK_END))
			.thenReturn(Optional.of(event2));
		// Both events belong to the same award group (DUEL, match-99)
		when(xpEvents.findByUserIdAndSourceAndSourceRefOrderByIdDesc(userId, XpSource.DUEL, "match-99"))
			.thenReturn(List.of(event2, event1));

		// Before this match (subtracting both events = 20 XP), user had 30 XP, which was rank 6 (5 users above them)
		when(xpEvents.countUsersRankedAbove(userId, 30L, WEEK_START, WEEK_END)).thenReturn(5L);

		Optional<WeeklyStanding> standingOpt = service.weeklyStanding(userId);

		assertThat(standingOpt).isPresent();
		WeeklyStanding standing = standingOpt.get();
		assertThat(standing.rank()).isEqualTo(5);
		assertThat(standing.previousRank()).isEqualTo(6);
		assertThat(standing.lastXpEventId()).isEqualTo(102L);
		assertThat(standing.weeklyXp()).isEqualTo(50);
	}

	@Test
	void rankDoesNotChangeWhenAwardGroupXpDoesNotCrossRankBoundary() {
		String userId = "user1";
		when(weekCalculator.currentWeek()).thenReturn(WEEK);
		when(xpEvents.sumXpByUserIdBetween(userId, WEEK_START, WEEK_END)).thenReturn(50L);
		when(xpEvents.countUsersRankedAbove(userId, 50L, WEEK_START, WEEK_END)).thenReturn(4L); // rank 5

		XpEvent event = XpEvent.builder()
			.id(101L)
			.userId(userId)
			.category("berlin")
			.source(XpSource.DUEL)
			.sourceRef("match-99")
			.xp(5)
			.createdAt(IN_WEEK)
			.build();

		when(xpEvents.findTopByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdDesc(userId, WEEK_START, WEEK_END))
			.thenReturn(Optional.of(event));
		when(xpEvents.findByUserIdAndSourceAndSourceRefOrderByIdDesc(userId, XpSource.DUEL, "match-99"))
			.thenReturn(List.of(event));

		// At 45 XP, still 4 users above (rank 5)
		when(xpEvents.countUsersRankedAbove(userId, 45L, WEEK_START, WEEK_END)).thenReturn(4L);

		Optional<WeeklyStanding> standingOpt = service.weeklyStanding(userId);

		assertThat(standingOpt).isPresent();
		WeeklyStanding standing = standingOpt.get();
		assertThat(standing.rank()).isEqualTo(5);
		assertThat(standing.previousRank()).isNull();
		assertThat(standing.lastXpEventId()).isEqualTo(101L);
		assertThat(standing.weeklyXp()).isEqualTo(50);
	}

	@Test
	void returnsEmptyWhenUserHasZeroWeeklyXp() {
		when(weekCalculator.currentWeek()).thenReturn(WEEK);
		when(xpEvents.sumXpByUserIdBetween("user1", WEEK_START, WEEK_END)).thenReturn(0L);

		Optional<WeeklyStanding> standing = service.weeklyStanding("user1");

		assertThat(standing).isEmpty();
	}

}
