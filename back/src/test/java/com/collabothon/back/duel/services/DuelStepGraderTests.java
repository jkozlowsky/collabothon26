package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class DuelStepGraderTests {

	private final DuelStepGrader grader = new DuelStepGrader();

	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void quizIsCorrectOnlyForTheCorrectIndex() {
		ObjectNode step = json.createObjectNode().put("type", "quiz").put("correctIndex", 2);
		step.putArray("options").add("A").add("B").add("C").add("D");
		DuelQuestion quiz = question(step);

		assertThat(grader.grade(quiz, option(2))).isTrue();
		assertThat(grader.grade(quiz, option(0))).isFalse();
		assertThat(grader.grade(quiz, option(1))).isFalse();
		assertThat(grader.grade(quiz, value(2.0))).isFalse();
		assertThat(grader.grade(quiz, null)).isFalse();
	}

	@Test
	void predictAcceptsValuesWithinToleranceIncludingTheEdges() {
		DuelQuestion predict = question(json.createObjectNode().put("type", "predict").put("answer", 100.0)
			.put("tolerance", 10.0));

		assertThat(grader.grade(predict, value(100.0))).isTrue();
		assertThat(grader.grade(predict, value(110.0))).isTrue();
		assertThat(grader.grade(predict, value(90.0))).isTrue();
		assertThat(grader.grade(predict, value(110.01))).isFalse();
		assertThat(grader.grade(predict, value(89.99))).isFalse();
		assertThat(grader.grade(predict, option(100))).isFalse();
	}

	@Test
	void chartAcceptsValuesWithinToleranceIncludingTheEdges() {
		DuelQuestion chart = question(json.createObjectNode().put("type", "chart").put("answer", 25.0)
			.put("tolerance", 2.5));

		assertThat(grader.grade(chart, value(25.0))).isTrue();
		assertThat(grader.grade(chart, value(27.5))).isTrue();
		assertThat(grader.grade(chart, value(22.5))).isTrue();
		assertThat(grader.grade(chart, value(27.51))).isFalse();
		assertThat(grader.grade(chart, value(22.49))).isFalse();
	}

	@Test
	void sortAndMatchAreCorrectOnlyWithoutMistakes() {
		DuelQuestion sort = question(json.createObjectNode().put("type", "sort"));
		DuelQuestion match = question(json.createObjectNode().put("type", "match"));

		assertThat(grader.grade(sort, mistakes(0))).isTrue();
		assertThat(grader.grade(sort, mistakes(1))).isFalse();
		assertThat(grader.grade(sort, mistakes(3))).isFalse();
		assertThat(grader.grade(match, mistakes(0))).isTrue();
		assertThat(grader.grade(match, mistakes(2))).isFalse();
		assertThat(grader.grade(match, option(0))).isFalse();
	}

	private static DuelQuestion question(ObjectNode step) {
		return new DuelQuestion("q", "berlin-1", null, "berlin", step);
	}

	private static ChosenAnswer option(int option) {
		return new ChosenAnswer(option, null, null);
	}

	private static ChosenAnswer value(double value) {
		return new ChosenAnswer(null, value, null);
	}

	private static ChosenAnswer mistakes(int mistakes) {
		return new ChosenAnswer(null, null, mistakes);
	}

}
