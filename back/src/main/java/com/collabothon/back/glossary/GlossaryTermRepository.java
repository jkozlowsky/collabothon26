package com.collabothon.back.glossary;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface GlossaryTermRepository extends JpaRepository<GlossaryTerm, Long> {

	// open-in-view is off, so everything the detail DTO touches is fetched here.
	@EntityGraph(attributePaths = { "category", "related" })
	Optional<GlossaryTerm> findBySlug(String slug);

	// Search uses strpos/starts_with instead of LIKE, so %, _ and \ typed by the user need no escaping.
	// :q is always trimmed and lower-cased by the caller.

	/** Terms whose name or an alias contains q; names starting with q come first. */
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

	/** Candidates whose definition text contains q (the caller strips link markup and filters again). */
	@Query(nativeQuery = true, value = """
			SELECT t.* FROM glossary_term t
			WHERE strpos(lower(t.definition_standard), :q) > 0
			   OR strpos(lower(coalesce(t.definition_plain, '')), :q) > 0
			ORDER BY t.name
			LIMIT 50
			""")
	List<GlossaryTerm> findDefinitionsContaining(@Param("q") String q);

	/** Typo tolerance (pg_trgm): "divdend" is similar enough to "dividend". */
	@Query(nativeQuery = true, value = """
			SELECT t.* FROM glossary_term t
			WHERE similarity(lower(t.name), :q) > 0.3
			ORDER BY similarity(lower(t.name), :q) DESC, t.name
			LIMIT 3
			""")
	List<GlossaryTerm> findSimilarByName(@Param("q") String q);

}
