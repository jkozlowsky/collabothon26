package com.collabothon.back.lesson;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface LessonCompletionRepository extends JpaRepository<LessonCompletion, LessonCompletionId> {

	@Query("select c.lessonId from LessonCompletion c where c.userId = :userId")
	List<String> findLessonIds(String userId);

	@Query("select coalesce(sum(c.xp), 0) from LessonCompletion c where c.userId = :userId")
	int totalXp(String userId);

	long countByUserId(String userId);

	/** 0 when the lesson was already completed: a repeat earns nothing. */
	@Transactional
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO lesson_completion (user_id, lesson_id, xp) VALUES (:userId, :lessonId, :xp)
			ON CONFLICT (user_id, lesson_id) DO NOTHING""")
	int insertFirst(String userId, String lessonId, int xp);

	@Modifying
	@Query("delete from LessonCompletion c where c.userId = :userId")
	void deleteByUserId(String userId);

}
