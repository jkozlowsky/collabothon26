package com.collabothon.back.xp.repositories;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.xp.XpEvent;

@Repository
@Transactional(propagation = Propagation.MANDATORY)
public interface XpEventRepository extends JpaRepository<XpEvent, Long> {

	/**
	 * Inserts the event unless the same (user, source, sourceRef, category) is already recorded. Native because JPQL
	 * has no {@code ON CONFLICT}; a find-then-save would race under concurrent requests.
	 * @return 1 if inserted, 0 if it was a duplicate
	 */
	@Modifying
	@Query(value = """
			INSERT INTO xp_event (user_id, category, source, source_ref, xp, created_at)
			VALUES (:userId, :category, :source, :sourceRef, :xp, :createdAt)
			ON CONFLICT (user_id, source, source_ref, category) DO NOTHING
			""", nativeQuery = true)
	int insertIfAbsent(String userId, String category, String source, String sourceRef, int xp, Instant createdAt);

	@Query("SELECT COALESCE(SUM(e.xp), 0) FROM XpEvent e WHERE e.userId = :userId")
	long sumXpByUserId(String userId);

	@Query("SELECT e.category AS category, SUM(e.xp) AS xp FROM XpEvent e WHERE e.userId = :userId GROUP BY e.category")
	List<CategoryXpProjection> sumXpPerCategory(String userId);

	@Query("""
			SELECT e.category AS category, SUM(e.xp) AS xp FROM XpEvent e
			WHERE e.userId = :userId AND e.createdAt >= :from AND e.createdAt < :to
			GROUP BY e.category
			""")
	List<CategoryXpProjection> sumXpPerCategoryBetween(String userId, Instant from, Instant to);

	@Query("SELECT e.userId AS userId, SUM(e.xp) AS xp FROM XpEvent e WHERE e.userId IN :userIds GROUP BY e.userId")
	List<UserXpProjection> sumXpPerUser(Collection<String> userIds);

	/** Users ranked by XP earned in [from, to), ties broken by user id. */
	@Query("""
			SELECT e.userId AS userId, SUM(e.xp) AS xp FROM XpEvent e
			WHERE e.createdAt >= :from AND e.createdAt < :to
			GROUP BY e.userId
			ORDER BY SUM(e.xp) DESC, e.userId ASC
			""")
	List<UserXpProjection> rankUsersBetween(Instant from, Instant to, Limit limit);

	@Query("""
			SELECT COALESCE(SUM(e.xp), 0) FROM XpEvent e
			WHERE e.userId = :userId AND e.createdAt >= :from AND e.createdAt < :to
			""")
	long sumXpByUserIdBetween(String userId, Instant from, Instant to);

	/** How many users rank above one with {@code xp} in [from, to), using the same order as {@link #rankUsersBetween}. */
	@Query("""
			SELECT COUNT(*) FROM (
			    SELECT e.userId AS userId, SUM(e.xp) AS total FROM XpEvent e
			    WHERE e.createdAt >= :from AND e.createdAt < :to
			    GROUP BY e.userId
			) t
			WHERE t.total > :xp OR (t.total = :xp AND t.userId < :userId)
			""")
	long countUsersRankedAbove(String userId, long xp, Instant from, Instant to);

	boolean existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(String userId, Instant from, Instant to);

}
