package com.collabothon.back.duel.services;

import java.util.List;

import org.springframework.stereotype.Component;

import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Grades one answer against its question.
 * Sort and match are graded against the deterministic shuffle for (matchId, index).
 */
@Component
public class DuelStepGrader {

	private static final double EPSILON = 1e-9;

	public boolean grade(DuelQuestion question, ChosenAnswer answer) {
		return grade(0L, 0, question, answer);
	}

	public boolean grade(long matchId, int index, DuelQuestion question, ChosenAnswer answer) {
		if (answer == null) {
			return false;
		}
		ObjectNode step = question.step();
		return switch (question.type()) {
			case "quiz" -> answer.option() != null && answer.option() == step.path("correctIndex").asInt();
			case "predict", "chart" -> isWithinTolerance(step, answer.value());
			case "sort" -> gradeSort(matchId, index, step, answer.buckets());
			case "match" -> gradeMatch(matchId, index, step, answer.pairs());
			default -> false;
		};
	}

	private static boolean gradeSort(long matchId, int index, ObjectNode step, List<Integer> userBuckets) {
		JsonNode items = step.path("items");
		if (userBuckets == null || userBuckets.size() != items.size()) {
			return false;
		}
		List<Integer> perm = DuelShuffle.sortPermutation(matchId, index, items.size());
		for (int i = 0; i < items.size(); i++) {
			int originalIndex = perm.get(i);
			int expectedBucket = items.get(originalIndex).path("bucket").asInt();
			Integer actualBucket = userBuckets.get(i);
			if (actualBucket == null || actualBucket != expectedBucket) {
				return false;
			}
		}
		return true;
	}

	private static boolean gradeMatch(long matchId, int index, ObjectNode step, List<Integer> userPairs) {
		JsonNode pairs = step.path("pairs");
		int size = pairs.size();
		if (userPairs == null || userPairs.size() != size) {
			return false;
		}
		DuelShuffle.MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, size);
		for (int i = 0; i < size; i++) {
			Integer rightIndex = userPairs.get(i);
			if (rightIndex == null || rightIndex < 0 || rightIndex >= size) {
				return false;
			}
			int originalLeftPair = perms.left().get(i);
			int originalRightPair = perms.right().get(rightIndex);
			if (originalLeftPair != originalRightPair) {
				return false;
			}
		}
		return true;
	}

	private static boolean isWithinTolerance(ObjectNode step, Double value) {
		if (value == null) {
			return false;
		}
		double target = step.path("answer").asDouble();
		double tolerance = step.path("tolerance").asDouble();
		return Math.abs(value - target) <= tolerance + EPSILON;
	}

}
