package com.collabothon.back.duel.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.json.JsonMapper;

class DuelContentParserTests {

	private static final Map<String, String> LESSON_STORIES = Map.of("berlin-1", "berlin", "seoul-1", "seoul");

	private final DuelContentParser parser = new DuelContentParser(
			lessonId -> Optional.ofNullable(LESSON_STORIES.get(lessonId)));

	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void parsesValidQuestionsWithTheStoryAsCategory() {
		List<DuelQuestion> questions = parse("""
				{ "id": "b1", "lessonId": "berlin-1", "timeLimitMs": 15000,
				  "step": { "id": "s1", "type": "quiz", "options": ["A", "B"], "correctIndex": 1 } },
				{ "id": "b2", "lessonId": "berlin-1",
				  "step": { "id": "s2", "type": "predict", "answer": 5, "tolerance": 1, "input": { "min": 0, "max": 10 } } }
				""");

		assertThat(questions).extracting(DuelQuestion::id).containsExactly("b1", "b2");
		assertThat(questions).extracting(DuelQuestion::category).containsOnly("berlin");
		assertThat(questions).extracting(DuelQuestion::timeLimitMs).containsExactly(15_000L, null);
	}

	@Test
	void rejectsStepTypesThatDuelsDoNotSupport() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "berlin-1", "step": { "id": "s1", "type": "unknown_type" } }
				""", "type 'unknown_type' is not allowed in duels");
	}

	@Test
	void rejectsUnknownLessons() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "missing",
				  "step": { "id": "s1", "type": "quiz", "options": ["A","B"], "correctIndex": 0 } }
				""", "lessonId 'missing' does not exist");
	}

	@Test
	void rejectsLessonsOfAnotherStory() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "seoul-1",
				  "step": { "id": "s1", "type": "quiz", "options": ["A","B"], "correctIndex": 0 } }
				""", "belongs to story 'seoul'");
	}

	@Test
	void rejectsQuizCorrectIndexOutOfBounds() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "berlin-1",
				  "step": { "id": "s1", "type": "quiz", "options": ["A","B"], "correctIndex": 3 } }
				""", "correctIndex 3 out of bounds");
	}

	@Test
	void rejectsNonPositiveTolerance() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "berlin-1",
				  "step": { "id": "s1", "type": "predict", "answer": 10, "tolerance": 0 } }
				""", "tolerance must be positive");
	}

	@Test
	void rejectsAnswersOutsideTheInputRange() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "berlin-1",
				  "step": { "id": "s1", "type": "predict", "answer": 11, "tolerance": 1, "input": { "min": 0, "max": 10 } } }
				""", "outside input range");
	}

	@Test
	void rejectsUnknownChartModels() {
		assertInvalid("""
				{ "id": "b1", "lessonId": "berlin-1",
				  "step": { "id": "s1", "type": "chart", "model": "invalidModel", "answer": 10, "tolerance": 1 } }
				""", "unknown chart model 'invalidModel'");
	}

	@Test
	void rejectsDuplicateQuestionAndStepIds() {
		assertInvalid("""
				{ "id": "dup", "lessonId": "berlin-1", "step": { "id": "s1", "type": "sort", "items": ["A","B"] } },
				{ "id": "dup", "lessonId": "berlin-1", "step": { "id": "s2", "type": "sort", "items": ["A","B"] } }
				""", "missing or duplicate question id 'dup'");
		assertInvalid("""
				{ "id": "b1", "lessonId": "berlin-1", "step": { "id": "s1", "type": "match", "pairs": [["A","B"],["C","D"]] } },
				{ "id": "b2", "lessonId": "berlin-1", "step": { "id": "s1", "type": "match", "pairs": [["A","B"],["C","D"]] } }
				""", "missing or duplicate step id 's1'");
	}

	@Test
	void rejectsFilesWithoutStoryOrQuestions() {
		assertThatThrownBy(() -> parser.parse("test.json", json.readTree("{ \"questions\": [] }")))
			.hasMessageContaining("missing story property");
		assertThatThrownBy(() -> parser.parse("test.json", json.readTree("{ \"story\": \"berlin\", \"questions\": [] }")))
			.hasMessageContaining("has no questions");
	}

	private List<DuelQuestion> parse(String questions) {
		return parser.parse("test.json", json.readTree("{ \"story\": \"berlin\", \"questions\": [" + questions + "] }"));
	}

	private void assertInvalid(String questions, String message) {
		assertThatThrownBy(() -> parse(questions)).isInstanceOf(IllegalStateException.class)
			.hasMessageContaining(message);
	}

}
