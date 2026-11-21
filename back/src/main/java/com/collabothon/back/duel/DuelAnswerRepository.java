package com.collabothon.back.duel;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DuelAnswerRepository extends JpaRepository<DuelAnswer, Long> {

	List<DuelAnswer> findByMatchIdOrderByPositionAsc(Long matchId);

	Optional<DuelAnswer> findByMatchIdAndPosition(Long matchId, int position);

}
