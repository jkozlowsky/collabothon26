package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
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
	void sortIsGradedAllOrNothingBasedOnDeterministicShuffle() {
		long matchId = 101L;
		int index = 4;

		ObjectNode step = json.createObjectNode().put("type", "sort");
		step.putArray("buckets").add("Bucket 0").add("Bucket 1");
		ArrayNode items = step.putArray("items");
		items.addObject().put("text", "item 0").put("bucket", 0);
		items.addObject().put("text", "item 1").put("bucket", 1);
		items.addObject().put("text", "item 2").put("bucket", 0);
		items.addObject().put("text", "item 3").put("bucket", 1);
		DuelQuestion sort = question(step);

		List<Integer> perm = DuelShuffle.sortPermutation(matchId, index, 4);
		// Compute correct buckets in shown order
		List<Integer> correctBuckets = new ArrayList<>();
		for (int originalIdx : perm) {
			correctBuckets.add(items.get(originalIdx).path("bucket").asInt());
		}

		// All correct -> true
		assertThat(grader.grade(matchId, index, sort, ChosenAnswer.ofBuckets(correctBuckets))).isTrue();

		// Partial wrong: flip first answer -> false
		List<Integer> partialWrong = new ArrayList<>(correctBuckets);
		partialWrong.set(0, 1 - partialWrong.get(0));
		assertThat(grader.grade(matchId, index, sort, ChosenAnswer.ofBuckets(partialWrong))).isFalse();

		// Wrong length -> false
		assertThat(grader.grade(matchId, index, sort, ChosenAnswer.ofBuckets(List.of(0, 1)))).isFalse();

		// Null answer or null buckets -> false
		assertThat(grader.grade(matchId, index, sort, null)).isFalse();
		assertThat(grader.grade(matchId, index, sort, ChosenAnswer.ofBuckets(null))).isFalse();
		assertThat(grader.grade(matchId, index, sort, option(0))).isFalse();
	}

	@Test
	void matchIsGradedAllOrNothingBasedOnDeterministicShuffle() {
		long matchId = 202L;
		int index = 5;

		ObjectNode step = json.createObjectNode().put("type", "match");
		ArrayNode pairs = step.putArray("pairs");
		pairs.addArray().add("L0").add("R0");
		pairs.addArray().add("L1").add("R1");
		pairs.addArray().add("L2").add("R2");
		pairs.addArray().add("L3").add("R3");
		DuelQuestion match = question(step);

		DuelShuffle.MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, 4);
		// For shown left item i, it came from pair perms.left().get(i).
		// We need the index in shown right that came from the same pair.
		List<Integer> correctPairs = new ArrayList<>();
		for (int i = 0; i < 4; i++) {
			int originalPair = perms.left().get(i);
			int rightIndex = perms.right().indexOf(originalPair);
			correctPairs.add(rightIndex);
		}

		// All correct -> true
		assertThat(grader.grade(matchId, index, match, ChosenAnswer.ofPairs(correctPairs))).isTrue();

		// Partial wrong: swap two answers -> false
		List<Integer> partialWrong = new ArrayList<>(correctPairs);
		partialWrong.set(0, correctPairs.get(1));
		partialWrong.set(1, correctPairs.get(0));
		assertThat(grader.grade(matchId, index, match, ChosenAnswer.ofPairs(partialWrong))).isFalse();

		// Out of bounds right index -> false
		List<Integer> outOfBounds = new ArrayList<>(correctPairs);
		outOfBounds.set(0, 99);
		assertThat(grader.grade(matchId, index, match, ChosenAnswer.ofPairs(outOfBounds))).isFalse();

		// Wrong length -> false
		assertThat(grader.grade(matchId, index, match, ChosenAnswer.ofPairs(List.of(0, 1)))).isFalse();

		// Null answer or null pairs -> false
		assertThat(grader.grade(matchId, index, match, null)).isFalse();
		assertThat(grader.grade(matchId, index, match, ChosenAnswer.ofPairs(null))).isFalse();
		assertThat(grader.grade(matchId, index, match, option(0))).isFalse();
	}

	private static DuelQuestion question(ObjectNode step) {
		return new DuelQuestion("q", "berlin-1", null, "berlin", step);
	}

	private static ChosenAnswer option(int option) {
		return new ChosenAnswer(option, null, null, null);
	}

	private static ChosenAnswer value(double value) {
		return new ChosenAnswer(null, value, null, null);
	}

}
