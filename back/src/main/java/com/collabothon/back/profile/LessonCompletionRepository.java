package com.collabothon.back.profile;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface LessonCompletionRepository extends JpaRepository<LessonCompletion, Long> {

	List<LessonCompletion> findByUserId(String userId);

	boolean existsByUserIdAndLessonId(String userId, Long lessonId);

	@Modifying
	@Query("delete from LessonCompletion c where c.userId = :userId")
	void deleteByUserId(String userId);

	/** The XP a lesson is worth; empty if there is no such lesson. */
	@Query("select l.xp from Lesson l where l.id = :lessonId")
	Optional<Integer> lessonXp(Long lessonId);

}
