package com.collabothon.back.duel.services;

import java.util.List;

import org.springframework.stereotype.Component;

import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.consts.DuelStepConsts;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.models.MatchPermutations;
import com.collabothon.back.entities.duel.ChosenAnswer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Grades an answer; sort and match are graded in the order the player was shown. */
@Component
public class DuelStepGrader {

	public boolean grade(long matchId, int index, DuelQuestion question, ChosenAnswer answer) {
		if (answer == null) {
			return false;
		}
		ObjectNode step = question.step();
		return switch (question.type()) {
			case DuelStepConsts.QUIZ -> gradeQuiz(step, answer.option());
			case DuelStepConsts.PREDICT, DuelStepConsts.CHART -> isWithinTolerance(step, answer.value());
			case DuelStepConsts.SORT -> gradeSort(matchId, index, step, answer.buckets());
			case DuelStepConsts.MATCH -> gradeMatch(matchId, index, step, answer.pairs());
			default -> false;
		};
	}

	private static boolean gradeQuiz(ObjectNode step, Integer option) {
		return option != null && option == step.path("correctIndex").asInt();
	}

	private static boolean gradeSort(long matchId, int index, ObjectNode step, List<Integer> buckets) {
		JsonNode items = step.path("items");
		if (buckets == null || buckets.size() != items.size()) {
			return false;
		}
		List<Integer> shownOrder = DuelShuffle.sortPermutation(matchId, index, items.size());
		for (int i = 0; i < items.size(); i++) {
			int expected = items.get(shownOrder.get(i)).path("bucket").asInt();
			Integer actual = buckets.get(i);
			if (actual == null || actual != expected) {
				return false;
			}
		}
		return true;
	}

	private static boolean gradeMatch(long matchId, int index, ObjectNode step, List<Integer> pairs) {
		int size = step.path("pairs").size();
		if (pairs == null || pairs.size() != size) {
			return false;
		}
		MatchPermutations shown = DuelShuffle.matchPermutations(matchId, index, size);
		for (int i = 0; i < size; i++) {
			Integer rightIndex = pairs.get(i);
			if (rightIndex == null || rightIndex < 0 || rightIndex >= size) {
				return false;
			}
			if (!shown.left().get(i).equals(shown.right().get(rightIndex))) {
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
		return Math.abs(value - target) <= tolerance + DuelConsts.TOLERANCE_EPSILON;
	}

}
