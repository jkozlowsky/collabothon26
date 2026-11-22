package com.collabothon.back.xp.services;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.xp.XpEvent;
import com.collabothon.back.xp.repositories.UserXpProjection;
import com.collabothon.back.xp.repositories.XpEventRepository;

import lombok.RequiredArgsConstructor;

// REQUIRED: the ranking calls both inside its transaction and must not need a second connection.
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
		WeeklyStanding standing = new WeeklyStanding(rankWith(userId, weeklyXp, week), Math.toIntExact(weeklyXp),
				null, null);
		return Optional.of(xpEvents
			.findTopByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdDesc(userId, week.start(), week.end())
			.map(latest -> withLatestAward(standing, latest, week))
			.orElse(standing));
	}

	// An award can span several categories, so the rank before it leaves out all of that award's events.
	private WeeklyStanding withLatestAward(WeeklyStanding standing, XpEvent latest, WeekWindow week) {
		String userId = latest.getUserId();
		List<XpEvent> award = xpEvents.findByUserIdAndSourceAndSourceRefOrderByIdDesc(userId, latest.getSource(),
				latest.getSourceRef());
		long lastEventId = award.stream().mapToLong(XpEvent::getId).max().orElse(latest.getId());
		long awardXp = award.stream().filter(event -> week.contains(event.getCreatedAt())).mapToLong(XpEvent::getXp).sum();
		int rankBefore = rankWith(userId, Math.max(0, standing.weeklyXp() - awardXp), week);
		Integer previousRank = null;
		if (rankBefore != standing.rank()) {
			previousRank = rankBefore;
		}
		return new WeeklyStanding(standing.rank(), standing.weeklyXp(), previousRank, lastEventId);
	}

	private int rankWith(String userId, long xp, WeekWindow week) {
		return Math.toIntExact(xpEvents.countUsersRankedAbove(userId, xp, week.start(), week.end()) + 1);
	}

}
