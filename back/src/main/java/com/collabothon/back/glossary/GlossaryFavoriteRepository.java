package com.collabothon.back.glossary;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

interface GlossaryFavoriteRepository extends JpaRepository<GlossaryFavorite, GlossaryFavoriteId> {

	@Query("""
			select t.slug from GlossaryFavorite f join GlossaryTerm t on t.id = f.termId
			where f.userId = :userId order by f.createdAt, t.slug""")
	List<String> findSlugs(String userId);

	@Transactional
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO glossary_favorite (user_id, term_id) VALUES (:userId, :termId)
			ON CONFLICT DO NOTHING""")
	void add(String userId, Long termId);

}
