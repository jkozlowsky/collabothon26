package com.collabothon.back.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ScenarioChoiceRepository extends JpaRepository<ScenarioChoice, Long> {

	@Modifying
	@Query("delete from ScenarioChoice s where s.userId = :userId")
	void deleteByUserId(String userId);

}
