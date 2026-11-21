package com.collabothon.back.duel;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface DuelAnswerRepository extends JpaRepository<DuelAnswer, Long> {

	List<DuelAnswer> findByMatchIdAndUserIdOrderByPositionAsc(Long matchId, String userId);

	@Query("""
			select q.categoryId as categoryId,
			       count(a.id) as totalCount,
			       sum(case when a.correct = true then 1L else 0L end) as correctCount
			from DuelAnswer a, DuelQuestion q
			where a.questionId = q.id and a.userId = :userId and a.createdAt >= :since
			group by q.categoryId
			""")
	List<CategoryAccuracy> findAccuracyByCategorySince(@Param("userId") String userId, @Param("since") Instant since);

	/** Read-only projection for per-category accuracy aggregation. */
	interface CategoryAccuracy {

		Long getCategoryId();

		long getTotalCount();

		long getCorrectCount();

	}

}
