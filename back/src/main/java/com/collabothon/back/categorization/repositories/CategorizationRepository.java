package com.collabothon.back.categorization.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.collabothon.back.categorization.entities.Categorization;

public interface CategorizationRepository extends CrudRepository<Categorization, String> {

	@Query("select c.data from Categorization c where c.userId = :userId")
	Optional<String> findData(String userId);

}
