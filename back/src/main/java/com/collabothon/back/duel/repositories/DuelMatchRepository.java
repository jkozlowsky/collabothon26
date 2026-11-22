package com.collabothon.back.duel.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.MatchStatus;

@Repository
@Transactional(propagation = Propagation.MANDATORY)
public interface DuelMatchRepository extends JpaRepository<DuelMatch, Long> {

	Optional<DuelMatch> findByIdAndUserId(Long id, String userId);

	List<DuelMatch> findByUserIdAndStatusAndOpponentMatchIdIsNotNull(String userId, MatchStatus status);

	List<DuelMatch> findTop2ByUserIdAndIdLessThanOrderByIdDesc(String userId, Long matchId);

	/** Unfinished matches first, then newest first. */
	@Query("""
			SELECT m FROM DuelMatch m
			WHERE m.userId = :userId
			ORDER BY CASE WHEN m.status = com.collabothon.back.entities.duel.MatchStatus.FINISHED THEN 1 ELSE 0 END,
			         m.startedAt DESC
			""")
	List<DuelMatch> findHistory(String userId, Limit limit);

}
