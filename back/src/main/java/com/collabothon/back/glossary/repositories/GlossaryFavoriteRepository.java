package com.collabothon.back.glossary.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.glossary.GlossaryFavorite;
import com.collabothon.back.entities.glossary.GlossaryFavorite.GlossaryFavoriteId;

@Transactional(propagation = Propagation.MANDATORY)
public interface GlossaryFavoriteRepository extends JpaRepository<GlossaryFavorite, GlossaryFavoriteId> {

	@Query("""
			SELECT f.term.slug FROM GlossaryFavorite f
			WHERE f.id.userId = :userId
			ORDER BY f.createdAt, f.term.slug
			""")
	List<String> findSlugsByUserId(@Param("userId") String userId);

	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO glossary_favorite (user_id, term_id, created_at)
			SELECT :userId, id, now() FROM glossary_term WHERE slug = :slug
			ON CONFLICT DO NOTHING
			""")
	int addFavorite(@Param("userId") String userId, @Param("slug") String slug);

	@Modifying
	@Query(nativeQuery = true, value = """
			DELETE FROM glossary_favorite
			WHERE user_id = :userId AND term_id = (SELECT id FROM glossary_term WHERE slug = :slug)
			""")
	int deleteFavorite(@Param("userId") String userId, @Param("slug") String slug);
}
