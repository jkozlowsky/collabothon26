package com.collabothon.back.xp.services;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.xp.repositories.UserXpProjection;
import com.collabothon.back.xp.repositories.XpEventRepository;

import lombok.RequiredArgsConstructor;

/** Weekly XP ranking over the ledger: highest weekly XP first, ties broken by user id. */
@Service
@RequiredArgsConstructor
public class XpLeaderboardService {

	private final XpEventRepository xpEvents;

	private final XpWeekCalculator weekCalculator;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<UserXpProjection> weeklyTop(int limit) {
		WeekWindow week = weekCalculator.currentWeek();
		return xpEvents.rankUsersBetween(week.start(), week.end(), Limit.of(limit));
	}

	/** The user's standing this week, or empty if they earned no XP this week. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public Optional<WeeklyStanding> weeklyStanding(String userId) {
		if (userId == null || userId.isBlank()) {
			return Optional.empty();
		}
		WeekWindow week = weekCalculator.currentWeek();
		long weeklyXp = xpEvents.sumXpByUserIdBetween(userId, week.start(), week.end());
		if (weeklyXp == 0) {
			return Optional.empty();
		}
		long above = xpEvents.countUsersRankedAbove(userId, weeklyXp, week.start(), week.end());
		return Optional.of(new WeeklyStanding(Math.toIntExact(above + 1), Math.toIntExact(weeklyXp)));
	}

}
