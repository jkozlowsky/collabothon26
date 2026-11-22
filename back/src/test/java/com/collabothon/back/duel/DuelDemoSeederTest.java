package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.transaction.support.TransactionTemplate;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.dto.duel.RankingRowDto;
import com.collabothon.back.dto.duel.RankingsDto;
import com.collabothon.back.duel.demo.DuelDemoSeeder;
import com.collabothon.back.duel.services.DuelRankingService;
import com.collabothon.back.entities.xp.XpEvent;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.xp.repositories.XpEventRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.LevelInfo;
import com.collabothon.back.xp.services.WeekWindow;
import com.collabothon.back.xp.services.XpService;
import com.collabothon.back.xp.services.XpWeekCalculator;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@TestPropertySource(properties = "app.duel.seed-demo-xp=true")
class DuelDemoSeederTest {

	@TestBean
	Clock clock;

	static Clock clock() {
		return Clock.fixed(Instant.parse("2026-11-23T10:00:00Z"), ZoneId.of("Europe/Warsaw"));
	}

	@Autowired
	DuelDemoSeeder seeder;

	@Autowired
	DuelRankingService rankingService;

	@Autowired
	XpService xpService;

	@Autowired
	XpEventRepository xpEvents;

	@Autowired
	TransactionTemplate tx;

	@Autowired
	XpWeekCalculator weekCalculator;

	@Test
	void demoSeedingIsIdempotentAndPlacesDemoUserAtRank6() {
		// Run seeder
		seeder.run(new DefaultApplicationArguments());

		// Verify weekly rankings
		RankingsDto rankings = rankingService.weeklyRankings("demo-user");
		assertThat(rankings.top()).hasSize(50);

		// Tomasz rank 1 with 310 weekly XP
		assertThat(rankings.top().get(0).userId()).isEqualTo("demo-tomasz");
		assertThat(rankings.top().get(0).weeklyXp()).isEqualTo(310);

		// demo-kasia rank 5 with 128 weekly XP (2-3 XP above demo-user)
		assertThat(rankings.top().get(4).userId()).isEqualTo("demo-kasia");
		assertThat(rankings.top().get(4).weeklyXp()).isEqualTo(128);

		// demo-user rank 6 with 125 weekly XP
		assertThat(rankings.me()).isNotNull();
		assertThat(rankings.me().userId()).isEqualTo("demo-user");
		assertThat(rankings.me().weeklyXp()).isEqualTo(125);
		assertThat(rankings.me().rank()).isEqualTo(6);

		// Verify Daniel and Elena are in top 50, around ranks 12-25, weekly XP < 125
		RankingRowDto daniel = rankings.top().stream().filter(r -> r.userId().equals("demo-daniel")).findFirst().orElseThrow();
		assertThat(daniel.weeklyXp()).isLessThan(125);
		assertThat(daniel.rank()).isBetween(12, 25);

		RankingRowDto elena = rankings.top().stream().filter(r -> r.userId().equals("demo-elena")).findFirst().orElseThrow();
		assertThat(elena.weeklyXp()).isLessThan(125);
		assertThat(elena.rank()).isBetween(12, 25);

		// Run seeder second time -> must be idempotent (no duplicate rows)
		seeder.run(new DefaultApplicationArguments());

		RankingsDto rankings2 = rankingService.weeklyRankings("demo-user");
		assertThat(rankings2.me().weeklyXp()).isEqualTo(125);
		assertThat(rankings2.me().rank()).isEqualTo(6);
		assertThat(rankings2.top().get(0).weeklyXp()).isEqualTo(310);
	}

	@Test
	void demoUserRowsPinnedToOriginalFourRowsAndRankSix() {
		seeder.run(new DefaultApplicationArguments());

		RankingsDto rankings = rankingService.weeklyRankings("demo-user");
		assertThat(rankings.me()).isNotNull();
		assertThat(rankings.me().rank()).isEqualTo(6);
		assertThat(rankings.me().weeklyXp()).isEqualTo(125);
		assertThat(xpService.totalXp("demo-user")).isEqualTo(245);

		WeekWindow week = weekCalculator.currentWeek();
		Instant weekStart = week.start();
		Instant thisWeek1 = weekStart.plus(Duration.ofHours(12));
		Instant thisWeek2 = weekStart.plus(Duration.ofHours(36));
		Instant pastWeek1 = weekStart.minus(Duration.ofDays(7));
		Instant pastWeek2 = weekStart.minus(Duration.ofDays(16));

		List<XpEvent> demoUserEvents = tx.execute(status -> xpEvents.findAll()).stream()
			.filter(e -> "demo-user".equals(e.getUserId()))
			.sorted(Comparator.comparing(XpEvent::getId))
			.toList();

		assertThat(demoUserEvents).hasSize(4);

		assertThat(demoUserEvents)
			.extracting(
				XpEvent::getUserId,
				XpEvent::getCategory,
				XpEvent::getSource,
				XpEvent::getSourceRef,
				XpEvent::getXp,
				XpEvent::getCreatedAt
			)
			.containsExactly(
				tuple("demo-user", "saving", XpSource.DUEL, "seed-demo-user-w1", 59, thisWeek1),
				tuple("demo-user", "risk", XpSource.DUEL, "seed-demo-user-w2", 66, thisWeek2),
				tuple("demo-user", "borrowing", XpSource.DUEL, "seed-demo-user-p1", 60, pastWeek1),
				tuple("demo-user", "investing", XpSource.DUEL, "seed-demo-user-p2", 60, pastWeek2)
			);

		// Risk XP (66) is 5-10 XP below next level (Level 4, threshold 73; 73 - 66 = 7)
		int riskXp = demoUserEvents.stream().filter(e -> "risk".equals(e.getCategory())).mapToInt(XpEvent::getXp).sum();
		LevelCurve levelCurve = new LevelCurve();
		LevelInfo riskLevel = levelCurve.fromXp(riskXp);
		int xpToNext = riskLevel.xpForLevel() - riskLevel.xpIntoLevel();
		assertThat(xpToNext).isBetween(5, 10);
	}

	@Test
	void newPlayersAreSeededWhenWeekWasAlreadySeededForExistingPlayers() {
		// Simulate a DB where existing players already have XP this week
		WeekWindow week = weekCalculator.currentWeek();
		xpService.record("demo-tomasz", "saving", XpSource.DUEL, "preseed-tomasz", 310, week.start().plusSeconds(3600));

		// Run seeder
		seeder.run(new DefaultApplicationArguments());

		// Verify Daniel was still seeded even though Tomasz already had XP
		assertThat(xpService.hasXpBetween("demo-daniel", week.start(), week.end())).isTrue();
		assertThat(xpService.hasXpBetween("demo-elena", week.start(), week.end())).isTrue();
	}

}
