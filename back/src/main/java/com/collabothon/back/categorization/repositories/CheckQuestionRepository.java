package com.collabothon.back.categorization.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.categorization.entities.CheckQuestion;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

public interface CheckQuestionRepository extends Repository<CheckQuestion, String> {

	@Query("""
			select new com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection(
			       q.id, q.lessonId, l.title, l.summary, l.position, q.area, q.level, q.accountPrompt, q.slots,
			       q.genericPrompt, q.options, q.correctIndex, q.misconceptions, q.checks)
			from CheckQuestion q join com.collabothon.back.lesson.Lesson l on l.id = q.lessonId
			order by q.id""")
	List<CheckQuestionProjection> findBank();

}
