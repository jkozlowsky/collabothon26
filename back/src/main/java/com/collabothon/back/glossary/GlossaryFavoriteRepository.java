package com.collabothon.back.glossary;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface GlossaryFavoriteRepository extends JpaRepository<GlossaryFavorite, GlossaryFavoriteId> {

	@Query("""
			select t.slug from GlossaryFavorite f join GlossaryTerm t on t.id = f.termId
			where f.userId = :userId order by f.createdAt, t.slug""")
	List<String> findSlugs(String userId);

}
