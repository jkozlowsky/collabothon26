package com.collabothon.back.lesson;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface LessonRepository extends JpaRepository<Lesson, Long> {

	@EntityGraph(attributePaths = "questions")
	List<Lesson> findAllByOrderByPosition();

	@EntityGraph(attributePaths = "questions")
	Optional<Lesson> findWithQuestionsById(Long id);

}
