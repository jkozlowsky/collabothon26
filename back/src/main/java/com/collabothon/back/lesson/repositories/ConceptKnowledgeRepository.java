package com.collabothon.back.lesson.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.lesson.ConceptKnowledge;
import com.collabothon.back.entities.lesson.ConceptKnowledgeId;

@Transactional(propagation = Propagation.MANDATORY)
public interface ConceptKnowledgeRepository extends JpaRepository<ConceptKnowledge, ConceptKnowledgeId> {

	void deleteByIdUserId(String userId);

	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO concept_knowledge (user_id, concept, correct, attempts) VALUES (:userId, :concept, :correct, 1)
			ON CONFLICT (user_id, concept) DO UPDATE SET
			    correct = concept_knowledge.correct + EXCLUDED.correct,
			    attempts = concept_knowledge.attempts + 1
			""")
	void recordConcept(@Param("userId") String userId, @Param("concept") String concept, @Param("correct") int correct);

}
