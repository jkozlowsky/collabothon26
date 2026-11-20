package com.collabothon.back.duel;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface DuelCategoryRepository extends JpaRepository<DuelCategory, Long> {

	List<DuelCategory> findAllByOrderByPositionAsc();

	Optional<DuelCategory> findBySlug(String slug);

}
