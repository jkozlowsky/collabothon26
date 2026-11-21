package com.collabothon.back.duel;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.duel.DuelAnswerRepository.CategoryAccuracy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class DuelRepositoriesTest {

	@Autowired
	private DuelCategoryRepository categories;
	@Autowired
	private DuelQuestionRepository questions;
	@Autowired
	private DuelMatchRepository matches;
	@Autowired
	private DuelAnswerRepository answers;
	@Autowired
	private DuelProgressRepository progress;

	@Test
	void seededCategoriesAndQuestionsValidateAgainstSchema() {
		List<DuelCategory> all = categories.findAllByOrderByPositionAsc();
		assertThat(all).hasSize(5);
		assertThat(all.get(0).getSlug()).isEqualTo("instruments");

		List<DuelQuestion> instQuestions = questions.findByCategoryId(all.get(0).getId());
		assertThat(instQuestions).hasSize(15);
	}

	@Test
	void answerAccuracyProjectionAndRecentMatchIdsWork() {
		DuelCategory cat = categories.findBySlug("psychology").orElseThrow();
		DuelQuestion q = questions.findByCategoryId(cat.getId()).get(0);
		Instant now = Instant.now();

		DuelMatch m1 = matches.save(new DuelMatch(DuelMode.SOLO, cat.getId(), "repo-user", null, null, null,
				now.minus(2, ChronoUnit.HOURS)));
		DuelMatch m2 = matches.save(new DuelMatch(DuelMode.SOLO, cat.getId(), "repo-user", null, null, null,
				now.minus(1, ChronoUnit.HOURS)));

		List<Long> recent = matches.findRecentMatchIds(cat.getId(), "repo-user", PageRequest.of(0, 3));
		assertThat(recent).containsExactly(m2.getId(), m1.getId());

		answers.save(new DuelAnswer(m2.getId(), "repo-user", q.getId(), 0, q.getCorrectIndex(), true,
				DuelAnswer.Outcome.ANSWERED, 1200, now));
		answers.save(new DuelAnswer(m2.getId(), "repo-user", q.getId(), 1, null, false, DuelAnswer.Outcome.TIMEOUT, 40000,
				now));

		List<CategoryAccuracy> stats = answers.findAccuracyByCategorySince("repo-user", now.minus(1, ChronoUnit.DAYS));
		assertThat(stats).hasSize(1);
		assertThat(stats.get(0).getCategoryId()).isEqualTo(cat.getId());
		assertThat(stats.get(0).getTotalCount()).isEqualTo(2L);
		assertThat(stats.get(0).getCorrectCount()).isEqualTo(1L);
	}

	@Test
	void progressRepositoryFiltersCalibratedPlayers() {
		DuelCategory cat = categories.findBySlug("costs").orElseThrow();
		DuelProgress uncalibrated = new DuelProgress("repo-uncal", cat.getId());
		uncalibrated.applyMatch(50, 10, true);
		progress.save(uncalibrated);

		DuelProgress calibrated = new DuelProgress("repo-cal", cat.getId());
		for (int i = 0; i < 5; i++) {
			calibrated.applyMatch(40, 12, true);
		}
		progress.save(calibrated);

		List<DuelProgress> found = progress.findByCategoryIdAndHumanMatchesGreaterThanEqual(cat.getId(), 5);
		assertThat(found).extracting(DuelProgress::getUserId).contains("repo-cal").doesNotContain("repo-uncal");
	}

}
