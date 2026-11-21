package com.collabothon.back.lesson;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScenarioChoiceRepository extends JpaRepository<ScenarioChoice, Long> {

	void deleteByUserId(String userId);

}
