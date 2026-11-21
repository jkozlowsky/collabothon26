package com.collabothon.back.lesson;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LessonCompletionRepository extends JpaRepository<LessonCompletion, LessonCompletionId> {

	@Query("select c.lessonId from LessonCompletion c where c.userId = :userId")
	List<String> findLessonIds(String userId);

	@Query("select coalesce(sum(c.xp), 0) from LessonCompletion c where c.userId = :userId")
	int totalXp(String userId);

	long countByUserId(String userId);

	void deleteByUserId(String userId);

}
