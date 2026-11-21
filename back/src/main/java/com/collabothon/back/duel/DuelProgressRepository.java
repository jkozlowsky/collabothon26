package com.collabothon.back.duel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface DuelProgressRepository extends JpaRepository<DuelProgress, DuelProgress.Key> {

	List<DuelProgress> findByUserId(String userId);

	List<DuelProgress> findByUserIdIn(Collection<String> userIds);

	List<DuelProgress> findByCategoryIdAndHumanMatchesGreaterThanEqual(Long categoryId, int minHumanMatches);

	List<DuelProgress> findByHumanMatchesGreaterThanEqual(int minHumanMatches);

	/** Players with an account who have progress in the category, nearest Elo first. */
	@Query("""
			select p from DuelProgress p
			where p.categoryId = :categoryId and p.userId <> :userId
			  and exists (select 1 from DuelAccount a where a.userId = p.userId)
			order by abs(p.elo - :elo), p.userId
			""")
	List<DuelProgress> findClosestByElo(@Param("categoryId") Long categoryId, @Param("userId") String userId,
			@Param("elo") int elo, Pageable pageable);

}
