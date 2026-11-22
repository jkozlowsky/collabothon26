package com.collabothon.back.duel.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Limit;

import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.entities.duel.AnswerOutcome;
import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.entities.duel.MatchOutcome;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class DuelMatchRepositoryTests {

	private static final Instant T0 = Instant.parse("2026-11-23T10:00:00Z");

	@Autowired
	DuelMatchRepository matches;

	@Autowired
	DuelAnswerRepository answers;

	@Autowired
	TestEntityManager entityManager;

	@BeforeEach
	void clear() {
		answers.deleteAllInBatch();
		matches.deleteAllInBatch();
	}

	@Test
	void historyListsUnfinishedFirstThenNewestFirstUpToTheLimit() {
		DuelMatch finishedNew = start("hist", T0.plusSeconds(300));
		finishedNew.finish(MatchOutcome.SOLO, 3, null, T0.plusSeconds(400));
		DuelMatch openOld = start("hist", T0);
		DuelMatch openNew = start("hist", T0.plusSeconds(100));
		start("someone-else", T0.plusSeconds(500));
		entityManager.flush();

		assertThat(matches.findHistory("hist", Limit.of(10)))
			.extracting(DuelMatch::getId)
			.containsExactly(openNew.getId(), openOld.getId(), finishedNew.getId());
		assertThat(matches.findHistory("hist", Limit.of(2))).hasSize(2);
	}

	@Test
	void matchIsFoundOnlyForItsOwner() {
		DuelMatch match = start("owner", T0);

		assertThat(matches.findByIdAndUserId(match.getId(), "owner")).isPresent();
		assertThat(matches.findByIdAndUserId(match.getId(), "intruder")).isEmpty();
	}

	@Test
	void categoriesArrayAndChosenAnswerJsonRoundTrip() {
		DuelMatch match = matches.save(DuelMatch.start(DuelMode.HUMAN, List.of("berlin", "seoul"), "rt", "demo-ola",
				T0));
		answers.save(answer(match, 1, new ChosenAnswer(null, 19500.0, null, null)));
		answers.save(answer(match, 0, new ChosenAnswer(2, null, null, null)));
		answers.save(answer(match, 2, null));
		entityManager.flush();
		entityManager.clear();

		assertThat(matches.findById(match.getId()).orElseThrow().getCategories()).containsExactly("berlin", "seoul");
		List<DuelAnswer> stored = answers.findByMatchIdOrderByPositionAsc(match.getId());
		assertThat(stored).extracting(DuelAnswer::getPosition).containsExactly(0, 1, 2);
		assertThat(stored).extracting(DuelAnswer::getChosenAnswer)
			.containsExactly(new ChosenAnswer(2, null, null, null), new ChosenAnswer(null, 19500.0, null, null), null);
		assertThat(answers.findByMatchIdInOrderByPosition(List.of(match.getId()))).hasSize(3);
	}

	private DuelMatch start(String userId, Instant at) {
		return matches.save(DuelMatch.start(DuelMode.SOLO, List.of("berlin"), userId, null, at));
	}

	private static DuelAnswer answer(DuelMatch match, int position, ChosenAnswer chosen) {
		return DuelAnswer.builder()
			.matchId(match.getId())
			.position(position)
			.questionId("q" + position)
			.category("berlin")
			.chosenAnswer(chosen)
			.correct(true)
			.outcome(AnswerOutcome.ANSWERED)
			.createdAt(T0)
			.build();
	}

}
