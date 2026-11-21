package com.collabothon.back.categorization.repositories;

import java.util.Set;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.profile.LessonCompletion;

// Read-only, so the profile module's own repository stays package-private.
public interface CompletedLessonRepository extends Repository<LessonCompletion, Long> {

	@Query("select distinct c.lessonId from LessonCompletion c where c.userId = :userId")
	Set<Long> findLessonIds(String userId);

}
