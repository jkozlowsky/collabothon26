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

import com.collabothon.back.dto.converters.duel.DuelPlayerMapper;
import com.collabothon.back.dto.duel.RankingRowDto;
import com.collabothon.back.dto.duel.RankingsDto;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.models.PlayerIdentity;
import com.collabothon.back.duel.models.RankedPlayer;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.xp.repositories.UserXpProjection;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.WeeklyStanding;
import com.collabothon.back.xp.services.XpLeaderboardService;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** The weekly ranking over all XP, lessons and duels alike. */
@Service
@RequiredArgsConstructor
public class DuelRankingService {

	private final XpLeaderboardService leaderboard;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final AccountRepository accounts;

	private final DuelPlayerMapper playerMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public RankingsDto weeklyRankings(String userId) {
		List<UserXpProjection> top = leaderboard.weeklyTop(DuelConsts.RANKING_LIMIT);
		Optional<WeeklyStanding> standing = leaderboard.weeklyStanding(userId);

		Set<String> userIds = new HashSet<>();
		top.forEach(row -> userIds.add(row.getUserId()));
		standing.ifPresent(own -> userIds.add(userId));
		Map<String, RankedPlayer> players = rankedPlayers(userIds);

		List<RankingRowDto> topRows = new ArrayList<>(top.size());
		for (UserXpProjection row : top) {
			topRows.add(playerMapper.toTopRow(topRows.size() + 1, Math.toIntExact(row.getXp()),
					players.get(row.getUserId())));
		}
		RankingRowDto me = standing.map(own -> playerMapper.toOwnRow(own, players.get(userId))).orElse(null);
		return new RankingsDto(topRows, me);
	}

	private Map<String, RankedPlayer> rankedPlayers(Set<String> userIds) {
		Map<String, Account> accountsById = accounts.findAllById(userIds)
			.stream()
			.collect(Collectors.toMap(Account::getUserId, Function.identity()));
		Map<String, Integer> totalXp = xpService.totalXpPerUser(userIds);
		return userIds.stream().collect(Collectors.toMap(Function.identity(), id -> new RankedPlayer(id,
				PlayerIdentity.of(id, Optional.ofNullable(accountsById.get(id))),
				levelCurve.fromXp(totalXp.getOrDefault(id, 0)).level())));
	}

}
