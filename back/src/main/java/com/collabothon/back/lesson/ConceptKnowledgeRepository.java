package com.collabothon.back.lesson;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConceptKnowledgeRepository extends JpaRepository<ConceptKnowledge, ConceptKnowledgeId> {

	void deleteByUserId(String userId);

}
