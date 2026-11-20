package com.collabothon.back.duel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface DuelProgressRepository extends JpaRepository<DuelProgress, DuelProgress.Key> {

	List<DuelProgress> findByUserId(String userId);

	List<DuelProgress> findByUserIdIn(Collection<String> userIds);

	List<DuelProgress> findByCategoryIdAndHumanMatchesGreaterThanEqual(Long categoryId, int minHumanMatches);

	List<DuelProgress> findByHumanMatchesGreaterThanEqual(int minHumanMatches);

}
