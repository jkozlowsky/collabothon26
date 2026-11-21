package com.collabothon.back.duel;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface DuelMatchRepository extends JpaRepository<DuelMatch, Long> {

	List<DuelMatch> findByModeAndStatusAndEndedAtGreaterThanEqual(DuelMode mode, DuelMatch.Status status, Instant since);

	@Query("""
			select m.id from DuelMatch m
			where m.categoryId = :categoryId
			  and (m.playerA = :userId or m.playerB = :userId)
			order by m.startedAt desc
			""")
	List<Long> findRecentMatchIds(@Param("categoryId") Long categoryId, @Param("userId") String userId,
			Pageable pageable);

}
