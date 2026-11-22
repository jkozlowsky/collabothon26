package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.collabothon.back.dto.duel.RankingsDto;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.WeeklyStanding;
import com.collabothon.back.xp.services.XpLeaderboardService;
import com.collabothon.back.xp.services.XpService;

@ExtendWith(MockitoExtension.class)
class DuelRankingServiceTest {

	@Mock
	XpLeaderboardService leaderboard;

	@Mock
	XpService xpService;

	@Mock
	AccountRepository accounts;

	LevelCurve levelCurve = new LevelCurve();

	DuelRankingService service;

	@BeforeEach
	void setUp() {
		service = new DuelRankingService(leaderboard, xpService, levelCurve, accounts);
	}

	@Test
	void meIncludesPreviousRankAndLastXpEventIdWhenRankChanged() {
		when(leaderboard.weeklyTop(50)).thenReturn(List.of());
		when(leaderboard.weeklyStanding("user1"))
			.thenReturn(Optional.of(new WeeklyStanding(5, 130, 7, 42L)));
		when(accounts.findAllById(Set.of("user1")))
			.thenReturn(List.of(Account.builder().userId("user1").firstName("Alex").lastName("Novak").avatar("m1").build()));
		when(xpService.totalXpPerUser(Set.of("user1"))).thenReturn(Map.of("user1", 130));

		RankingsDto rankings = service.weeklyRankings("user1");
		assertThat(rankings.me()).isNotNull();
		assertThat(rankings.me().name()).isEqualTo("Alex Novak");
		assertThat(rankings.me().rank()).isEqualTo(5);
		assertThat(rankings.me().weeklyXp()).isEqualTo(130);
		assertThat(rankings.me().previousRank()).isEqualTo(7);
		assertThat(rankings.me().lastXpEventId()).isEqualTo(42L);
	}

	@Test
	void meHasNullPreviousRankWhenRankDidNotChange() {
		when(leaderboard.weeklyTop(50)).thenReturn(List.of());
		when(leaderboard.weeklyStanding("user1"))
			.thenReturn(Optional.of(new WeeklyStanding(5, 130, null, 42L)));
		when(accounts.findAllById(Set.of("user1")))
			.thenReturn(List.of(Account.builder().userId("user1").firstName("Alex").lastName("Novak").avatar("m1").build()));
		when(xpService.totalXpPerUser(Set.of("user1"))).thenReturn(Map.of("user1", 130));

		RankingsDto rankings = service.weeklyRankings("user1");
		assertThat(rankings.me()).isNotNull();
		assertThat(rankings.me().name()).isEqualTo("Alex Novak");
		assertThat(rankings.me().rank()).isEqualTo(5);
		assertThat(rankings.me().previousRank()).isNull();
		assertThat(rankings.me().lastXpEventId()).isEqualTo(42L);
	}

	@Test
	void meIsNullWhenUserHasNoWeeklyXp() {
		when(leaderboard.weeklyTop(50)).thenReturn(List.of());
		when(leaderboard.weeklyStanding("user1")).thenReturn(Optional.empty());
		when(accounts.findAllById(Set.of())).thenReturn(List.of());
		when(xpService.totalXpPerUser(Set.of())).thenReturn(Map.of());

		RankingsDto rankings = service.weeklyRankings("user1");
		assertThat(rankings.me()).isNull();
	}

}
