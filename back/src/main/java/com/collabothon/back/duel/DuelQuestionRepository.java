package com.collabothon.back.duel;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface DuelQuestionRepository extends JpaRepository<DuelQuestion, Long> {

	List<DuelQuestion> findByCategoryId(Long categoryId);

}
