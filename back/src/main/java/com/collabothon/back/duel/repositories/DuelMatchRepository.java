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

@Repository
@Transactional(propagation = Propagation.MANDATORY)
public interface DuelMatchRepository extends JpaRepository<DuelMatch, Long> {

	Optional<DuelMatch> findByIdAndUserId(Long id, String userId);

	/** The "Historia" order: unfinished matches first, then newest first. */
	@Query("""
			SELECT m FROM DuelMatch m
			WHERE m.userId = :userId
			ORDER BY CASE WHEN m.status = com.collabothon.back.entities.duel.MatchStatus.FINISHED THEN 1 ELSE 0 END,
			         m.startedAt DESC
			""")
	List<DuelMatch> findHistory(String userId, Limit limit);

}
