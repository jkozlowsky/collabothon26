package com.collabothon.back.categorization.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.categorization.entities.Categorization;

public interface CategorizationRepository extends CrudRepository<Categorization, String> {

	@Query("select c.data from Categorization c where c.userId = :userId")
	Optional<String> findData(String userId);

	/** 0 when the user has no completed onboarding. */
	@Transactional
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO categorization (user_id, data)
			SELECT user_id, CAST(:data AS jsonb) FROM user_profile WHERE user_id = :userId AND onboarding_completed
			ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data""")
	int saveIfOnboarded(String userId, String data);

}
