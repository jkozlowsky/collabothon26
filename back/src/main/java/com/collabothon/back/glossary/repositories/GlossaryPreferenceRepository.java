package com.collabothon.back.glossary.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.glossary.GlossaryPreference;

@Transactional(propagation = Propagation.MANDATORY)
public interface GlossaryPreferenceRepository extends JpaRepository<GlossaryPreference, String> {

	@Query("SELECT p.languageLevel FROM GlossaryPreference p WHERE p.userId = :userId")
	Optional<String> findLanguageLevelByUserId(@Param("userId") String userId);

	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO glossary_preference (user_id, language_level) VALUES (:userId, :level)
			ON CONFLICT (user_id) DO UPDATE SET language_level = EXCLUDED.language_level
			""")
	void upsertPreference(@Param("userId") String userId, @Param("level") String level);
}
