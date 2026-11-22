package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Stream;

import com.collabothon.back.duel.models.DuelQuestion;

import lombok.RequiredArgsConstructor;

/** The questions drawn so far for one match, unseen ones first. */
@RequiredArgsConstructor
final class QuestionDraw {

	private final Random random;

	private final Set<String> seenIds;

	private final Set<String> chosenIds = new HashSet<>();

	private final List<DuelQuestion> chosen = new ArrayList<>();

	/** Returns how many it drew. Both shuffles run even when the unseen ones suffice: later draws depend on it. */
	int draw(List<DuelQuestion> pool, int count) {
		if (pool.isEmpty() || count <= 0) {
			return 0;
		}
		List<DuelQuestion> unseen = new ArrayList<>();
		List<DuelQuestion> seen = new ArrayList<>();
		for (DuelQuestion question : pool) {
			if (chosenIds.contains(question.id())) {
				continue;
			}
			if (seenIds.contains(question.id())) {
				seen.add(question);
			}
			else {
				unseen.add(question);
			}
		}
		Collections.shuffle(unseen, random);
		Collections.shuffle(seen, random);
		List<DuelQuestion> drawn = Stream.concat(unseen.stream(), seen.stream()).limit(count).toList();
		drawn.forEach(this::add);
		return drawn.size();
	}

	void add(DuelQuestion question) {
		chosenIds.add(question.id());
		chosen.add(question);
	}

	int size() {
		return chosen.size();
	}

	List<DuelQuestion> questions() {
		return Collections.unmodifiableList(chosen);
	}

}
