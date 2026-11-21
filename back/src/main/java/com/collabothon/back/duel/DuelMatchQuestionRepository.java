package com.collabothon.back.duel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface DuelMatchQuestionRepository extends JpaRepository<DuelMatchQuestion, DuelMatchQuestion.Key> {

	List<DuelMatchQuestion> findByMatchIdOrderByPositionAsc(Long matchId);

	List<DuelMatchQuestion> findByMatchIdIn(Collection<Long> matchIds);

}
