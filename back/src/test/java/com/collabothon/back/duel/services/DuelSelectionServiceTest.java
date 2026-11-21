package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.lesson.repositories.StoryRepository;

import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

@ExtendWith(MockitoExtension.class)
class DuelSelectionServiceTest {

	@Mock
	DuelContentRepository content;

	@Mock
	StoryRepository stories;

	@Mock
	DuelMatchRepository matches;

	@Mock
	DuelAnswerRepository answers;

	DuelProperties properties = new DuelProperties();

	DuelSelectionService service;

	@BeforeEach
	void setUp() {
		service = new DuelSelectionService(content, stories, matches, answers, properties);
	}

	@Test
	void singleCategoryTakesAllSixSlots() {
		List<DuelQuestion> pool = createQuestions("berlin", 10, "quiz");
		when(content.findByStory("berlin")).thenReturn(pool);

		List<DuelQuestion> selected = service.select(100L, List.of("berlin"), Set.of(), 6);
		assertThat(selected).hasSize(6);
		assertThat(selected).allMatch(q -> "berlin".equals(q.category()));
	}

	@Test
	void twoCategoriesSplitThreeAndThree() {
		List<DuelQuestion> berlinPool = createQuestions("berlin", 10, "quiz");
		List<DuelQuestion> tokyoPool = createQuestions("tokyo", 10, "predict");
		when(content.findByStory("berlin")).thenReturn(berlinPool);
		when(content.findByStory("tokyo")).thenReturn(tokyoPool);

		List<DuelQuestion> selected = service.select(100L, List.of("berlin", "tokyo"), Set.of(), 6);
		assertThat(selected).hasSize(6);
		long berlinCount = selected.stream().filter(q -> "berlin".equals(q.category())).count();
		long tokyoCount = selected.stream().filter(q -> "tokyo".equals(q.category())).count();
		assertThat(berlinCount).isEqualTo(3);
		assertThat(tokyoCount).isEqualTo(3);
	}

	@Test
	void threeCategoriesSplitTwoEach() {
		when(content.findByStory("c1")).thenReturn(createQuestions("c1", 5, "quiz"));
		when(content.findByStory("c2")).thenReturn(createQuestions("c2", 5, "predict"));
		when(content.findByStory("c3")).thenReturn(createQuestions("c3", 5, "chart"));

		List<DuelQuestion> selected = service.select(100L, List.of("c1", "c2", "c3"), Set.of(), 6);
		assertThat(selected).hasSize(6);
		assertThat(selected.stream().filter(q -> "c1".equals(q.category())).count()).isEqualTo(2);
		assertThat(selected.stream().filter(q -> "c2".equals(q.category())).count()).isEqualTo(2);
		assertThat(selected.stream().filter(q -> "c3".equals(q.category())).count()).isEqualTo(2);
	}

	@Test
	void fourCategoriesSplitWithRemainderDistributedEvenly() {
		when(content.findByStory("c1")).thenReturn(createQuestions("c1", 5, "quiz"));
		when(content.findByStory("c2")).thenReturn(createQuestions("c2", 5, "predict"));
		when(content.findByStory("c3")).thenReturn(createQuestions("c3", 5, "chart"));
		when(content.findByStory("c4")).thenReturn(createQuestions("c4", 5, "sort"));

		List<DuelQuestion> selected = service.select(100L, List.of("c1", "c2", "c3", "c4"), Set.of(), 6);
		assertThat(selected).hasSize(6);
		List<Long> counts = List.of("c1", "c2", "c3", "c4").stream()
			.map(c -> selected.stream().filter(q -> c.equals(q.category())).count())
			.toList();
		// 2 categories should have 2 slots, 2 categories should have 1 slot
		assertThat(counts.stream().filter(c -> c == 2).count()).isEqualTo(2);
		assertThat(counts.stream().filter(c -> c == 1).count()).isEqualTo(2);
	}

	@Test
	void prioritizesUnseenQuestionsOverSeenInLastTwoMatches() {
		List<DuelQuestion> pool = createQuestions("berlin", 6, "quiz");
		when(content.findByStory("berlin")).thenReturn(pool);

		// berlin-0 and berlin-1 were seen in last 2 matches
		Set<String> seen = Set.of("berlin-0", "berlin-1");

		// Select 4 questions: should pick from unseen (berlin-2..5)
		List<DuelQuestion> selected = service.select(100L, List.of("berlin"), seen, 4);
		assertThat(selected).hasSize(4);
		assertThat(selected).extracting(DuelQuestion::id)
			.doesNotContainAnyElementsOf(seen);
	}

	@Test
	void fallsBackToSeenQuestionsWhenUnseenAreInsufficient() {
		List<DuelQuestion> pool = createQuestions("berlin", 3, "quiz");
		when(content.findByStory("berlin")).thenReturn(pool);

		// All 3 were seen
		Set<String> seen = Set.of("berlin-0", "berlin-1", "berlin-2");

		List<DuelQuestion> selected = service.select(100L, List.of("berlin"), seen, 3);
		assertThat(selected).hasSize(3);
		assertThat(selected).extracting(DuelQuestion::id).containsExactlyInAnyOrder("berlin-0", "berlin-1", "berlin-2");
	}

	@Test
	void fallsBackToRelatedCategoryWhenCategoryRunsShort() {
		// mumbai has only 2 questions
		List<DuelQuestion> mumbaiPool = createQuestions("mumbai", 2, "quiz");
		// tokyo has plenty
		List<DuelQuestion> tokyoPool = createQuestions("tokyo", 10, "chart");

		when(content.findByStory("mumbai")).thenReturn(mumbaiPool);
		when(content.findByStory("tokyo")).thenReturn(tokyoPool);

		Story mumbaiStory = storyWithFallback("mumbai", "tokyo");
		when(stories.findById("mumbai")).thenReturn(Optional.of(mumbaiStory));

		// Needs 6 questions from mumbai
		List<DuelQuestion> selected = service.select(100L, List.of("mumbai"), Set.of(), 6);
		assertThat(selected).hasSize(6);

		// 2 from mumbai, 4 from tokyo
		long mumbaiCount = selected.stream().filter(q -> "mumbai".equals(q.category())).count();
		long tokyoCount = selected.stream().filter(q -> "tokyo".equals(q.category())).count();
		assertThat(mumbaiCount).isEqualTo(2);
		assertThat(tokyoCount).isEqualTo(4);
	}

	@Test
	void avoidsMoreThanTwoConsecutiveSameStepTypes() {
		// 4 quiz questions and 2 predict questions
		List<DuelQuestion> pool = new ArrayList<>();
		pool.addAll(createQuestions("berlin", 4, "quiz"));
		pool.addAll(createQuestions("berlin", 2, "predict"));
		when(content.findByStory("berlin")).thenReturn(pool);

		List<DuelQuestion> selected = service.select(100L, List.of("berlin"), Set.of(), 6);
		assertThat(selected).hasSize(6);

		// Verify no 3 consecutive same types
		for (int i = 0; i < selected.size() - 2; i++) {
			boolean threeSame = selected.get(i).type().equals(selected.get(i + 1).type())
					&& selected.get(i).type().equals(selected.get(i + 2).type());
			assertThat(threeSame)
				.as("Three consecutive questions of type %s at indices %d,%d,%d", selected.get(i).type(), i, i + 1, i + 2)
				.isFalse();
		}
	}

	@Test
	void deterministicSeedingReplaysExactSameQuestions() {
		List<DuelQuestion> pool = createQuestions("berlin", 10, "quiz");
		when(content.findByStory("berlin")).thenReturn(pool);

		List<DuelQuestion> first = service.select(42L, List.of("berlin"), Set.of(), 6);
		List<DuelQuestion> second = service.select(42L, List.of("berlin"), Set.of(), 6);

		assertThat(first).extracting(DuelQuestion::id)
			.containsExactlyElementsOf(second.stream().map(DuelQuestion::id).toList());
	}

	private static List<DuelQuestion> createQuestions(String category, int count, String stepType) {
		List<DuelQuestion> questions = new ArrayList<>(count);
		for (int i = 0; i < count; i++) {
			ObjectNode step = JsonNodeFactory.instance.objectNode();
			step.put("id", category + "-s" + i);
			step.put("type", stepType);
			questions.add(new DuelQuestion(category + "-" + i, category + "-lesson", null, List.of(), null, category, step));
		}
		return questions;
	}

	private static Story storyWithFallback(String id, String fallback) {
		return new Story(id, id, id, id, "available", null, "", "", null, null, "", List.of(), null, List.of(), fallback, null);
	}

}
