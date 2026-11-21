package com.collabothon.back.glossary.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.glossary.GlossaryCategory;

@Transactional(propagation = Propagation.MANDATORY)
public interface GlossaryCategoryRepository extends JpaRepository<GlossaryCategory, Long> {

	@EntityGraph(attributePaths = "terms")
	List<GlossaryCategory> findAllByOrderByPosition();
}
