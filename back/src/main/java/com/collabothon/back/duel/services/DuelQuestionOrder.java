package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.List;

import com.collabothon.back.duel.models.DuelQuestion;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Keeps a step type from coming three times in a row, when possible. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class DuelQuestionOrder {

	static List<DuelQuestion> withoutThreeInARow(List<DuelQuestion> questions) {
		if (!hasThreeInARow(questions)) {
			return questions;
		}
		List<DuelQuestion> arranged = new ArrayList<>(questions.size());
		if (arrange(questions, new boolean[questions.size()], arranged)) {
			return arranged;
		}
		return questions;
	}

	private static boolean hasThreeInARow(List<DuelQuestion> questions) {
		for (int i = 2; i < questions.size(); i++) {
			if (wouldBeThirdInARow(questions.get(i), questions.subList(0, i))) {
				return true;
			}
		}
		return false;
	}

	// Backtracks to the first valid order, trying the candidates in their shuffled order.
	private static boolean arrange(List<DuelQuestion> questions, boolean[] used, List<DuelQuestion> arranged) {
		if (arranged.size() == questions.size()) {
			return true;
		}
		for (int i = 0; i < questions.size(); i++) {
			DuelQuestion candidate = questions.get(i);
			if (used[i] || wouldBeThirdInARow(candidate, arranged)) {
				continue;
			}
			used[i] = true;
			arranged.add(candidate);
			if (arrange(questions, used, arranged)) {
				return true;
			}
			arranged.removeLast();
			used[i] = false;
		}
		return false;
	}

	private static boolean wouldBeThirdInARow(DuelQuestion candidate, List<DuelQuestion> before) {
		int size = before.size();
		return size >= 2 && candidate.type().equals(before.get(size - 1).type())
				&& candidate.type().equals(before.get(size - 2).type());
	}

}
