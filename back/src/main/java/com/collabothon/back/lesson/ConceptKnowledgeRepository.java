package com.collabothon.back.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface ConceptKnowledgeRepository extends JpaRepository<ConceptKnowledge, ConceptKnowledgeId> {

	@Transactional
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO concept_knowledge (user_id, concept, correct, attempts) VALUES (:userId, :concept, :correct, 1)
			ON CONFLICT (user_id, concept) DO UPDATE SET
			    correct = concept_knowledge.correct + EXCLUDED.correct,
			    attempts = concept_knowledge.attempts + 1""")
	void record(String userId, String concept, int correct);

	@Modifying
	@Query("delete from ConceptKnowledge k where k.userId = :userId")
	void deleteByUserId(String userId);

}
