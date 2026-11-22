package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.duel.services.DuelDemoSeeder;
import com.collabothon.back.duel.services.DuelRankingService;
import com.collabothon.back.entities.xp.XpSource;
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
	XpWeekCalculator weekCalculator;

	@Test
	void demoSeedingIsIdempotentAndPlacesDemoUserAtRank6() {
		// Run seeder
		seeder.run(new DefaultApplicationArguments());

		// Verify weekly rankings
		var rankings = rankingService.weeklyRankings("demo-user");
		assertThat(rankings.top()).hasSize(50);

		// Tomasz rank 1 with 310 weekly XP
		assertThat(rankings.top().get(0).userId()).isEqualTo("demo-tomasz");
		assertThat(rankings.top().get(0).weeklyXp()).isEqualTo(310);

		// demo-user rank 6 with 125 weekly XP
		assertThat(rankings.me()).isNotNull();
		assertThat(rankings.me().userId()).isEqualTo("demo-user");
		assertThat(rankings.me().weeklyXp()).isEqualTo(125);
		assertThat(rankings.me().rank()).isEqualTo(6);

		// Verify Daniel and Elena are in top 50, around ranks 12-25, weekly XP < 125
		var daniel = rankings.top().stream().filter(r -> r.userId().equals("demo-daniel")).findFirst().orElseThrow();
		assertThat(daniel.weeklyXp()).isLessThan(125);
		assertThat(daniel.rank()).isBetween(12, 25);

		var elena = rankings.top().stream().filter(r -> r.userId().equals("demo-elena")).findFirst().orElseThrow();
		assertThat(elena.weeklyXp()).isLessThan(125);
		assertThat(elena.rank()).isBetween(12, 25);

		// Run seeder second time -> must be idempotent (no duplicate rows)
		seeder.run(new DefaultApplicationArguments());

		var rankings2 = rankingService.weeklyRankings("demo-user");
		assertThat(rankings2.me().weeklyXp()).isEqualTo(125);
		assertThat(rankings2.me().rank()).isEqualTo(6);
		assertThat(rankings2.top().get(0).weeklyXp()).isEqualTo(310);
	}

	@Test
	void newPlayersAreSeededWhenWeekWasAlreadySeededForExistingPlayers() {
		// Simulate a DB where existing players already have XP this week
		WeekWindow week = weekCalculator.currentWeek();
		xpService.record("demo-tomasz", "berlin", XpSource.DUEL, "preseed-tomasz", 310, week.start().plusSeconds(3600));

		// Run seeder
		seeder.run(new DefaultApplicationArguments());

		// Verify Daniel was still seeded even though Tomasz already had XP
		assertThat(xpService.hasXpBetween("demo-daniel", week.start(), week.end())).isTrue();
		assertThat(xpService.hasXpBetween("demo-elena", week.start(), week.end())).isTrue();
	}

}
