package com.collabothon.back.lesson.repositories;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.collabothon.back.entities.lesson.LessonCompletion;
import com.collabothon.back.entities.lesson.LessonCompletionId;

@Transactional(readOnly = true)
public interface LessonCompletionRepository extends JpaRepository<LessonCompletion, LessonCompletionId> {

	@Query("SELECT c.id.lessonId FROM LessonCompletion c WHERE c.id.userId = :userId")
	List<String> findLessonIdsByUserId(@Param("userId") String userId);

	default List<String> findLessonIds(String userId) {
		return findLessonIdsByUserId(userId);
	}

	long countByIdUserId(String userId);

	@Transactional(propagation = Propagation.MANDATORY)
	void deleteByIdUserId(String userId);

	@Transactional(propagation = Propagation.MANDATORY)
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO lesson_completion (user_id, lesson_id, xp, completed_at)
			VALUES (:userId, :lessonId, :xp, :completedAt)
			ON CONFLICT (user_id, lesson_id) DO NOTHING
			""")
	int insertIfAbsent(@Param("userId") String userId, @Param("lessonId") String lessonId, @Param("xp") int xp,
			@Param("completedAt") Instant completedAt);

	@Transactional
	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO lesson_completion (user_id, lesson_id, xp, completed_at)
			VALUES (:userId, :lessonId, :xp, now())
			ON CONFLICT (user_id, lesson_id) DO NOTHING
			""")
	int insertFirst(@Param("userId") String userId, @Param("lessonId") String lessonId, @Param("xp") int xp);
}
