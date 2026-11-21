package com.collabothon.back.duel;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.profile.Account;
import com.collabothon.back.profile.AccountRepository;
import com.collabothon.back.xp.LevelCurve;
import com.collabothon.back.xp.XpService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DuelRankingService {

	private static final int TOP_LIMIT = 50;

	private final JdbcClient jdbc;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final AccountRepository accounts;

	@Transactional(readOnly = true)
	public RankingsDto getWeeklyRankings(String userId) {
		XpService.WeekWindow window = xpService.currentWeekWindow();
		List<UserWeeklyTotal> weeklyTotals = jdbc.sql("""
				SELECT user_id, SUM(xp) AS weekly_xp
				FROM xp_event
				WHERE created_at >= ? AND created_at < ?
				GROUP BY user_id
				ORDER BY weekly_xp DESC, user_id ASC
				""")
			.params(java.sql.Timestamp.from(window.start()), java.sql.Timestamp.from(window.end()))
			.query((rs, rowNum) -> new UserWeeklyTotal(rs.getString("user_id"), rs.getInt("weekly_xp")))
			.list();

		Set<String> userIds = weeklyTotals.stream().map(UserWeeklyTotal::userId).collect(Collectors.toSet());
		Map<String, Account> accountMap = accounts.findAllById(userIds).stream()
			.collect(Collectors.toMap(Account::getUserId, Function.identity(), (a, b) -> a));

		List<RankingRow> allRows = new ArrayList<>(weeklyTotals.size());
		RankingRow meRow = null;

		for (int i = 0; i < weeklyTotals.size(); i++) {
			UserWeeklyTotal entry = weeklyTotals.get(i);
			int rank = i + 1;
			String uid = entry.userId();
			Account acc = accountMap.get(uid);
			String name = acc != null ? acc.getFirstName() : uid;
			String avatar = acc != null ? acc.getAvatar() : "m1";
			int totalXp = xpService.totalXp(uid);
			int level = levelCurve.fromXp(totalXp).level();
			RankingRow row = new RankingRow(rank, uid, name, avatar, level, entry.weeklyXp());
			allRows.add(row);
			if (userId != null && userId.equals(uid)) {
				meRow = row;
			}
		}

		List<RankingRow> top = allRows.stream().limit(TOP_LIMIT).toList();
		return new RankingsDto(top, meRow);
	}

	private record UserWeeklyTotal(String userId, int weeklyXp) {
	}

	public record RankingRow(
			int rank,
			String userId,
			String name,
			String avatar,
			int level,
			int weeklyXp
	) {
	}

	public record RankingsDto(
			List<RankingRow> top,
			RankingRow me
	) {
	}

}
