package com.collabothon.back.lesson;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface LessonActivityRepository extends JpaRepository<LessonActivity, LessonActivityId> {

	@Query("select a.completedOn from LessonActivity a where a.userId = :userId")
	List<LocalDate> findDays(String userId);

	boolean existsByUserId(String userId);

	@Modifying
	@Query("delete from LessonActivity a where a.userId = :userId")
	void deleteByUserId(String userId);

}
