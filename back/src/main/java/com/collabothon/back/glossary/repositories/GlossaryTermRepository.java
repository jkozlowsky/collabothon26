package com.collabothon.back.glossary.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.glossary.GlossaryTerm;

@Transactional(propagation = Propagation.MANDATORY)
public interface GlossaryTermRepository extends JpaRepository<GlossaryTerm, Long> {

	@EntityGraph(attributePaths = { "category", "related" })
	Optional<GlossaryTerm> findBySlug(String slug);

	boolean existsBySlug(String slug);

	@Query("select t.id from GlossaryTerm t where t.slug = :slug")
	Optional<Long> findIdBySlug(@Param("slug") String slug);

	@Query(nativeQuery = true, value = """
			SELECT t.* FROM glossary_term t
			WHERE strpos(lower(t.name), :q) > 0
			   OR EXISTS (SELECT 1 FROM unnest(t.aliases) a WHERE strpos(lower(a), :q) > 0)
			ORDER BY CASE WHEN starts_with(lower(t.name), :q) THEN 0
			              WHEN strpos(lower(t.name), :q) > 0 THEN 1 ELSE 2 END,
			         t.name
			LIMIT 20
			""")
	List<GlossaryTerm> searchByName(@Param("q") String q);

	@Query(nativeQuery = true, value = """
			SELECT t.* FROM glossary_term t
			WHERE strpos(lower(t.definition_standard), :q) > 0
			ORDER BY t.name
			LIMIT 50
			""")
	List<GlossaryTerm> findDefinitionsContaining(@Param("q") String q);

	@Query(nativeQuery = true, value = """
			SELECT t.* FROM glossary_term t
			WHERE similarity(lower(t.name), :q) > 0.3
			ORDER BY similarity(lower(t.name), :q) DESC, t.name
			LIMIT 3
			""")
	List<GlossaryTerm> findSimilarByName(@Param("q") String q);
}
