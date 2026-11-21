package com.collabothon.back.glossary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

interface GlossaryPreferenceRepository extends JpaRepository<GlossaryPreference, String> {

	@Transactional
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO glossary_preference (user_id, language_level) VALUES (:userId, :languageLevel)
			ON CONFLICT (user_id) DO UPDATE SET language_level = EXCLUDED.language_level""")
	void choose(String userId, String languageLevel);
}
