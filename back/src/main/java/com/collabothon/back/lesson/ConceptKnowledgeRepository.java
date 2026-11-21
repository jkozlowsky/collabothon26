package com.collabothon.back.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ConceptKnowledgeRepository extends JpaRepository<ConceptKnowledge, ConceptKnowledgeId> {

	@Modifying
	@Query("delete from ConceptKnowledge k where k.userId = :userId")
	void deleteByUserId(String userId);

}
