package com.collabothon.back.xp.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Limit;

import com.collabothon.back.TestcontainersConfiguration;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class XpEventRepositoryTests {

	private static final Instant WEEK_START = Instant.parse("2026-11-22T23:00:00Z");

	private static final Instant WEEK_END = Instant.parse("2026-11-29T23:00:00Z");

	private static final Instant IN_WEEK = WEEK_START.plusSeconds(3600);

	@Autowired
	XpEventRepository repository;

	@BeforeEach
	void clearLedger() {
		repository.deleteAllInBatch();
	}

	@Test
	void insertIfAbsentIgnoresTheSameEventTwice() {
		assertThat(repository.insertIfAbsent("ann", "berlin", "LESSON", "berlin-1", 50, IN_WEEK)).isEqualTo(1);
		assertThat(repository.insertIfAbsent("ann", "berlin", "LESSON", "berlin-1", 50, IN_WEEK)).isZero();
		assertThat(repository.insertIfAbsent("ann", "seoul", "LESSON", "berlin-1", 50, IN_WEEK)).isEqualTo(1);

		assertThat(repository.sumXpByUserId("ann")).isEqualTo(100);
		assertThat(repository.sumXpByUserId("nobody")).isZero();
	}

	@Test
	void sumsPerCategoryAllTimeAndWithinTheWeek() {
		repository.insertIfAbsent("ann", "berlin", "DUEL", "1", 10, IN_WEEK);
		repository.insertIfAbsent("ann", "berlin", "DUEL", "2", 20, WEEK_START.minusMillis(1));
		repository.insertIfAbsent("ann", "seoul", "DUEL", "3", 5, WEEK_END);

		assertThat(repository.sumXpPerCategory("ann"))
			.extracting(CategoryXpProjection::getCategory, CategoryXpProjection::getXp)
			.containsExactlyInAnyOrder(tuple("berlin", 30L),
					tuple("seoul", 5L));
		assertThat(repository.sumXpPerCategoryBetween("ann", WEEK_START, WEEK_END))
			.extracting(CategoryXpProjection::getCategory, CategoryXpProjection::getXp)
			.containsExactly(tuple("berlin", 10L));
	}

	@Test
	void ranksUsersByWeeklyXpThenUserIdAndCountsWhoIsAbove() {
		repository.insertIfAbsent("cid", "berlin", "DUEL", "1", 40, IN_WEEK);
		repository.insertIfAbsent("bob", "berlin", "DUEL", "1", 40, IN_WEEK);
		repository.insertIfAbsent("ann", "berlin", "DUEL", "1", 90, IN_WEEK);
		repository.insertIfAbsent("dan", "berlin", "DUEL", "1", 10, IN_WEEK);
		repository.insertIfAbsent("eve", "berlin", "DUEL", "1", 500, WEEK_START.minusSeconds(1));

		assertThat(repository.rankUsersBetween(WEEK_START, WEEK_END, Limit.of(3)))
			.extracting(UserXpProjection::getUserId)
			.containsExactly("ann", "bob", "cid");
		assertThat(repository.countUsersRankedAbove("ann", 90, WEEK_START, WEEK_END)).isZero();
		assertThat(repository.countUsersRankedAbove("cid", 40, WEEK_START, WEEK_END)).isEqualTo(2);
		assertThat(repository.countUsersRankedAbove("dan", 10, WEEK_START, WEEK_END)).isEqualTo(3);
		assertThat(repository.sumXpByUserIdBetween("eve", WEEK_START, WEEK_END)).isZero();
	}

	@Test
	void sumsTotalsForTheGivenUsersOnly() {
		repository.insertIfAbsent("ann", "berlin", "DUEL", "1", 10, IN_WEEK);
		repository.insertIfAbsent("ann", "seoul", "DUEL", "1", 15, WEEK_START.minusSeconds(1));
		repository.insertIfAbsent("bob", "berlin", "DUEL", "1", 40, IN_WEEK);

		assertThat(repository.sumXpPerUser(List.of("ann", "nobody")))
			.extracting(UserXpProjection::getUserId, UserXpProjection::getXp)
			.containsExactly(tuple("ann", 25L));
		assertThat(repository.existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan("ann", WEEK_START,
				WEEK_END)).isTrue();
	}

}
