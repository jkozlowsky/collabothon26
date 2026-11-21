package com.collabothon.back.lesson.repositories;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.collabothon.back.entities.lesson.LessonActivity;
import com.collabothon.back.entities.lesson.LessonActivityId;

@Transactional(propagation = Propagation.MANDATORY)
public interface LessonActivityRepository extends JpaRepository<LessonActivity, LessonActivityId> {

	@Query("SELECT a.id.completedOn FROM LessonActivity a WHERE a.id.userId = :userId ORDER BY a.id.completedOn ASC")
	List<LocalDate> findCompletedOnByUserId(@Param("userId") String userId);

	boolean existsByIdUserId(String userId);

	void deleteByIdUserId(String userId);

	@Modifying
	@Query(nativeQuery = true, value = """
			INSERT INTO lesson_activity (user_id, completed_on) VALUES (:userId, :completedOn)
			ON CONFLICT DO NOTHING
			""")
	int recordActivity(@Param("userId") String userId, @Param("completedOn") LocalDate completedOn);
}
