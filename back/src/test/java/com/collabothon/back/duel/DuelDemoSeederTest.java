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

	@Test
	void demoSeedingIsIdempotentAndPlacesDemoUserMidTable() {
		// Run seeder
		seeder.run(new DefaultApplicationArguments());

		// Verify weekly rankings
		var rankings = rankingService.weeklyRankings("demo-user");
		assertThat(rankings.top()).isNotEmpty();

		// Tomasz rank 1 with 310 weekly XP
		assertThat(rankings.top().get(0).userId()).isEqualTo("demo-tomasz");
		assertThat(rankings.top().get(0).weeklyXp()).isEqualTo(310);

		// demo-user rank 6 with 125 weekly XP
		assertThat(rankings.me()).isNotNull();
		assertThat(rankings.me().userId()).isEqualTo("demo-user");
		assertThat(rankings.me().weeklyXp()).isEqualTo(125);
		assertThat(rankings.me().rank()).isEqualTo(6);

		// Run seeder second time -> must be idempotent (no duplicate rows)
		seeder.run(new DefaultApplicationArguments());

		var rankings2 = rankingService.weeklyRankings("demo-user");
		assertThat(rankings2.me().weeklyXp()).isEqualTo(125);
		assertThat(rankings2.top().get(0).weeklyXp()).isEqualTo(310);
	}

}
