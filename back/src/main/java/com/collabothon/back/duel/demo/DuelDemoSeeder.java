package com.collabothon.back.duel.demo;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.consts.DemoConsts;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.services.WeekWindow;
import com.collabothon.back.xp.services.XpService;
import com.collabothon.back.xp.services.XpWeekCalculator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Demo XP for the weekly ranking; skips every player who already has XP this week. */
@Component
@ConditionalOnProperty(name = "app.duel.seed-demo-xp", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DuelDemoSeeder implements ApplicationRunner {

	private final XpService xpService;

	private final XpWeekCalculator weekCalculator;

	private final StoryRepository stories;

	private final DuelContentRepository content;

	@Override
	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public void run(ApplicationArguments args) {
		WeekWindow week = weekCalculator.currentWeek();
		List<String> categories = stories.canonicalAreaSlugs().stream().filter(content::hasDuelContent).toList();
		if (categories.isEmpty()) {
			log.warn("No stories with duel content found; skipping demo XP seeding.");
			return;
		}
		int seededCount = 0;
		for (DemoPlayer player : DuelDemoSeedConsts.PLAYERS) {
			if (!xpService.hasXpBetween(player.userId(), week.start(), week.end())) {
				seed(player, categories, week.start());
				seededCount++;
			}
		}
		log.info("Demo XP seeding completed (seeded {} of {} players across {} categories).", seededCount,
				DuelDemoSeedConsts.PLAYERS.size(), categories.size());
	}

	private void seed(DemoPlayer player, List<String> categories, Instant weekStart) {
		if (DemoConsts.ALEX_USER_ID.equals(player.userId())) {
			DuelDemoSeedConsts.ALEX_ROWS.forEach(row -> record(player.userId(), row, weekStart));
			return;
		}
		seedEvenly(player, categories, weekStart);
	}

	// The player's XP is split evenly over the categories, alternating between two days of each week.
	private void seedEvenly(DemoPlayer player, List<String> categories, Instant weekStart) {
		int count = categories.size();
		for (int i = 0; i < count; i++) {
			Duration thisWeek = DuelDemoSeedConsts.THIS_WEEK_FIRST;
			Duration pastWeek = DuelDemoSeedConsts.PAST_FIRST;
			if (i % 2 != 0) {
				thisWeek = DuelDemoSeedConsts.THIS_WEEK_SECOND;
				pastWeek = DuelDemoSeedConsts.PAST_SECOND;
			}
			String category = categories.get(i);
			record(player.userId(), new DemoXpRow(category, DuelDemoSeedConsts.WEEKLY_PART,
					share(player.weeklyXp(), count, i), thisWeek), weekStart);
			record(player.userId(), new DemoXpRow(category, DuelDemoSeedConsts.PAST_PART,
					share(player.pastXp(), count, i), pastWeek), weekStart);
		}
	}

	private static int share(int total, int count, int index) {
		int share = total / count;
		if (index < total % count) {
			share++;
		}
		return share;
	}

	private void record(String userId, DemoXpRow row, Instant weekStart) {
		if (row.xp() > 0) {
			xpService.record(userId, row.category(), XpSource.DUEL, "seed-" + userId + "-" + row.part(), row.xp(),
					weekStart.plus(row.sinceWeekStart()));
		}
	}

}
