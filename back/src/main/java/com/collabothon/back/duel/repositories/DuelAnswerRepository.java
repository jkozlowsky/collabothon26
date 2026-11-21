package com.collabothon.back.duel.repositories;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.duel.DuelAnswer;

@Repository
@Transactional(propagation = Propagation.MANDATORY)
public interface DuelAnswerRepository extends JpaRepository<DuelAnswer, Long> {

	List<DuelAnswer> findByMatchIdOrderByPositionAsc(Long matchId);

	List<DuelAnswer> findByMatchIdInOrderByPosition(Collection<Long> matchIds);

}
