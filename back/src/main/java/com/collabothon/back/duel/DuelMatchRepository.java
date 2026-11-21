package com.collabothon.back.duel;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface DuelMatchRepository extends JpaRepository<DuelMatch, Long> {

	@Query("""
			SELECT m FROM DuelMatch m
			WHERE m.userId = :userId
			ORDER BY CASE WHEN m.status = 'FINISHED' THEN 1 ELSE 0 END ASC,
			         m.startedAt DESC
			""")
	List<DuelMatch> findHistory(String userId, Pageable pageable);

}
