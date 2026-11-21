package com.collabothon.back.glossary;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface GlossaryCategoryRepository extends JpaRepository<GlossaryCategory, Long> {

	@EntityGraph(attributePaths = "terms")
	List<GlossaryCategory> findAllByOrderByPosition();

}
