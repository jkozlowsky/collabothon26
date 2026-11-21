package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.duel.RankingRowDto;
import com.collabothon.back.dto.duel.RankingsDto;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.xp.repositories.UserXpProjection;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.WeeklyStanding;
import com.collabothon.back.xp.services.XpLeaderboardService;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** The weekly ranking (ISO week, Europe/Warsaw) over all XP, lessons and duels alike. */
@Service
@RequiredArgsConstructor
public class DuelRankingService {

	static final int TOP_LIMIT = 50;

	private final XpLeaderboardService leaderboard;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final AccountRepository accounts;

	/** The top 50 plus the user's own row, which is null if they earned no XP this week. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public RankingsDto weeklyRankings(String userId) {
		List<UserXpProjection> top = leaderboard.weeklyTop(TOP_LIMIT);
		Optional<WeeklyStanding> standing = leaderboard.weeklyStanding(userId);

		Set<String> userIds = new HashSet<>();
		top.forEach(row -> userIds.add(row.getUserId()));
		standing.ifPresent(s -> userIds.add(userId));
		Map<String, Account> accountsById = accounts.findAllById(userIds)
			.stream()
			.collect(Collectors.toMap(Account::getUserId, Function.identity()));
		Map<String, Integer> totalXp = xpService.totalXpPerUser(userIds);

		List<RankingRowDto> topRows = new ArrayList<>(top.size());
		for (int i = 0; i < top.size(); i++) {
			UserXpProjection row = top.get(i);
			topRows.add(row(i + 1, row.getUserId(), Math.toIntExact(row.getXp()), accountsById, totalXp));
		}
		RankingRowDto me = standing.map(s -> row(s.rank(), userId, s.weeklyXp(), accountsById, totalXp))
			.orElse(null);
		return new RankingsDto(topRows, me);
	}

	private RankingRowDto row(int rank, String userId, int weeklyXp, Map<String, Account> accountsById,
			Map<String, Integer> totalXp) {
		Optional<Account> account = Optional.ofNullable(accountsById.get(userId));
		String name = account.map(Account::getFirstName).orElse(userId);
		String avatar = account.map(Account::getAvatar).orElse(DuelPlayerCardService.DEFAULT_AVATAR);
		int level = levelCurve.fromXp(totalXp.getOrDefault(userId, 0)).level();
		return new RankingRowDto(rank, userId, name, avatar, level, weeklyXp);
	}

}
