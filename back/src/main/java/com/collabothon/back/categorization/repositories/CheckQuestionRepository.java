package com.collabothon.back.categorization.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.categorization.entities.CheckQuestion;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

public interface CheckQuestionRepository extends Repository<CheckQuestion, String> {

	@Query("""
			select new com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection(
			       q.id, q.category, q.area, q.lessonId, l.title, q.accountPrompt, q.slots, q.genericPrompt,
			       q.criterion)
			from CheckQuestion q left join com.collabothon.back.lesson.Lesson l on l.id = q.lessonId
			order by q.id""")
	List<CheckQuestionProjection> findPool();

}
