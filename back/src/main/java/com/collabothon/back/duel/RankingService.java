package com.collabothon.back.duel;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.exceptions.BadRequestException;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/**
 * Computes duel leaderboards (category, overall, friends and Europe/Berlin weekly league),
 * returning the top 50 rows plus the requesting player's pinned row.
 */
@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class RankingService {

	static final ZoneId WEEKLY_ZONE = ZoneId.of("Europe/Berlin");

	private static final int TOP_LIMIT = 50;

	private static final Comparator<RankEntry> ENTRY_ORDER = Comparator.comparingInt(RankEntry::value)
		.reversed()
		.thenComparing(Comparator.comparingInt(RankEntry::tieBreak).reversed())
		.thenComparing(RankEntry::userId);

	private final DuelPersistenceService persistence;

	private final DuelAccountRepository accounts;

	private final DuelProgressRepository progress;

	private final DuelMatchRepository matches;

	private final LevelCurve levelCurve;

	private final EloService eloService;

	private final Clock clock;

	/**
	 * Computes rankings for the given scope.
	 *
	 * @param scope one of {@code category}, {@code overall}, {@code friends}, {@code weekly}
	 * @param categorySlug required when {@code scope} is {@code category}
	 * @param userId optional requesting user id for the pinned {@code me} row
	 * @return top 50 rows and the caller's row (or {@code null} if unranked)
	 */
	@Transactional(readOnly = true)
	public Ranking rankings(String scope, String categorySlug, String userId) {
		return switch (scope) {
			case "category" -> categoryRankings(categorySlug, userId);
			case "overall" -> overallRankings(userId);
			case "friends" -> friendsRankings(userId);
			case "weekly" -> weeklyRankings(userId);
			default -> throw new BadRequestException("Unknown scope: " + scope);
		};
	}

	private Ranking categoryRankings(String categorySlug, String userId) {
		if (categorySlug == null || categorySlug.isBlank()) {
			throw new BadRequestException("category is required for scope=category");
		}
		DuelCategory cat = persistence.requireCategory(categorySlug);

		List<DuelProgress> calibrated = progress.findByCategoryIdAndHumanMatchesGreaterThanEqual(cat.getId(),
				EloService.CALIBRATION_MATCHES);
		Set<String> userIds = new LinkedHashSet<>();
		List<RankEntry> entries = new ArrayList<>(calibrated.size());
		for (DuelProgress p : calibrated) {
			userIds.add(p.getUserId());
			entries.add(new RankEntry(p.getUserId(), levelCurve.fromXp(p.getXp()).level(), p.getElo(), p.getElo(),
					p.getXp()));
		}
		entries.sort(ENTRY_ORDER);
		return buildRanking(entries, loadPlayers(userIds), userId);
	}

	private Ranking overallRankings(String userId) {
		Map<String, List<DuelProgress>> byUser = groupProgressByUser(progress.findAll());
		List<RankEntry> entries = new ArrayList<>();
		Set<String> userIds = new LinkedHashSet<>();
		for (Map.Entry<String, List<DuelProgress>> e : byUser.entrySet()) {
			OverallStats stats = computeOverallStats(e.getValue());
			if (stats.calibrated()) {
				userIds.add(e.getKey());
				entries.add(new RankEntry(e.getKey(), stats.level(), stats.elo(), stats.elo(), stats.totalXp()));
			}
		}
		entries.sort(ENTRY_ORDER);
		return buildRanking(entries, loadPlayers(userIds), userId);
	}

	/**
	 * Stand-in friends ranking until a real friends list exists: every account counts as a friend, so it
	 * lists all accounts (plus the caller even without one) ordered by overall Elo; those without duel
	 * progress appear with the starting Elo and level 1.
	 */
	private Ranking friendsRankings(String userId) {
		Map<String, DuelAccount> playerMap = new HashMap<>();
		Set<String> userIds = new LinkedHashSet<>();
		for (DuelAccount p : accounts.findAll()) {
			playerMap.put(p.getUserId(), p);
			userIds.add(p.getUserId());
		}
		if (userId != null && !userId.isBlank()) {
			userIds.add(userId);
		}
		Map<String, List<DuelProgress>> byUser = userIds.isEmpty() ? Map.of()
				: groupProgressByUser(progress.findByUserIdIn(userIds));

		List<RankEntry> entries = new ArrayList<>(userIds.size());
		for (String uid : userIds) {
			OverallStats stats = computeOverallStats(byUser.getOrDefault(uid, List.of()));
			entries.add(new RankEntry(uid, stats.level(), stats.elo(), stats.elo(), stats.totalXp()));
		}
		entries.sort(ENTRY_ORDER);
		return buildRanking(entries, playerMap, userId);
	}

	private Ranking weeklyRankings(String userId) {
		Instant weekStart = ZonedDateTime.now(clock.withZone(WEEKLY_ZONE))
			.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.truncatedTo(ChronoUnit.DAYS)
			.toInstant();
		List<DuelMatch> weekMatches = matches.findByModeAndStatusAndEndedAtGreaterThanEqual(DuelMode.HUMAN,
				DuelMatch.Status.FINISHED, weekStart);

		Map<String, Integer> weeklyGain = new HashMap<>();
		for (DuelMatch m : weekMatches) {
			if (m.getPlayerA() != null) {
				weeklyGain.merge(m.getPlayerA(), m.getEloDeltaA() != null ? m.getEloDeltaA() : 0, Integer::sum);
			}
			if (m.getPlayerB() != null) {
				weeklyGain.merge(m.getPlayerB(), m.getEloDeltaB() != null ? m.getEloDeltaB() : 0, Integer::sum);
			}
		}

		Set<String> userIds = weeklyGain.keySet();
		Map<String, List<DuelProgress>> byUser = userIds.isEmpty() ? Map.of()
				: groupProgressByUser(progress.findByUserIdIn(userIds));

		List<RankEntry> entries = new ArrayList<>(userIds.size());
		for (Map.Entry<String, Integer> e : weeklyGain.entrySet()) {
			OverallStats stats = computeOverallStats(byUser.getOrDefault(e.getKey(), List.of()));
			entries.add(new RankEntry(e.getKey(), stats.level(), stats.elo(), e.getValue(), stats.elo()));
		}
		entries.sort(ENTRY_ORDER);
		return buildRanking(entries, loadPlayers(userIds), userId);
	}

	private Map<String, DuelAccount> loadPlayers(Set<String> userIds) {
		if (userIds.isEmpty()) {
			return Map.of();
		}
		return accounts.findAllByUserIdIn(userIds)
			.stream()
			.collect(Collectors.toMap(DuelAccount::getUserId, Function.identity(), (a, b) -> a));
	}

	private Map<String, List<DuelProgress>> groupProgressByUser(List<DuelProgress> list) {
		return list.stream().collect(Collectors.groupingBy(DuelProgress::getUserId));
	}

	private OverallStats computeOverallStats(List<DuelProgress> list) {
		int totalXp = 0;
		long calibratedSum = 0;
		int calibratedCount = 0;
		long allEloSum = 0;
		for (DuelProgress p : list) {
			totalXp += p.getXp();
			allEloSum += p.getElo();
			if (eloService.isCalibrated(p.getHumanMatches())) {
				calibratedSum += p.getElo();
				calibratedCount++;
			}
		}
		int level = levelCurve.fromXp(totalXp).level();
		int elo = calibratedCount > 0 ? (int) Math.round((double) calibratedSum / calibratedCount)
				: (!list.isEmpty() ? (int) Math.round((double) allEloSum / list.size()) : DuelProgress.STARTING_ELO);
		return new OverallStats(calibratedCount > 0, level, elo, totalXp);
	}

	private Ranking buildRanking(List<RankEntry> sorted, Map<String, DuelAccount> playerMap, String userId) {
		List<RankedEntry> top = new ArrayList<>(Math.min(TOP_LIMIT, sorted.size()));
		RankedEntry me = null;
		for (int i = 0; i < sorted.size(); i++) {
			RankEntry entry = sorted.get(i);
			DuelAccount account = playerMap.get(entry.userId());
			String name = account != null ? account.getFirstName() : entry.userId();
			String avatar = account != null ? account.getAvatar() : DuelAccount.DEFAULT_AVATAR;
			RankedEntry row = new RankedEntry(i + 1, entry.userId(), name, avatar, entry.level(), entry.elo(),
					entry.value());
			if (i < TOP_LIMIT) {
				top.add(row);
			}
			if (entry.userId().equals(userId)) {
				me = row;
			}
		}
		return new Ranking(top, me);
	}

	private record RankEntry(String userId, int level, int elo, int value, int tieBreak) {
	}

	/** One leaderboard row; {@code value} is Elo, or the Elo gained this week in the weekly league. */
	record RankedEntry(int rank, String userId, String name, String avatar, int level, int elo, int value) {
	}

	/** The top 50 and the caller's own row, null while the caller is unranked. */
	record Ranking(List<RankedEntry> top, RankedEntry me) {
	}

	private record OverallStats(boolean calibrated, int level, int elo, int totalXp) {
	}

}
