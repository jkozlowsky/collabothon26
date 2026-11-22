package com.collabothon.back.lesson.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.lesson.ScenarioChoice;

@Transactional(propagation = Propagation.MANDATORY)
public interface ScenarioChoiceRepository extends JpaRepository<ScenarioChoice, Long> {

	void deleteByUserId(String userId);

}
