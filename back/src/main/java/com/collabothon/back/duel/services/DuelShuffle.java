package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * Deterministic shuffle for sort and match questions in a duel.
 * Seeded by (matchId, question index) so the server can reconstruct the shown order without storing it.
 */
public final class DuelShuffle {

	private static final long MULTIPLIER = 10007L;

	private DuelShuffle() {
	}

	public static long seed(long matchId, int index) {
		return matchId * MULTIPLIER + index;
	}

	public static List<Integer> sortPermutation(long matchId, int index, int size) {
		List<Integer> order = new ArrayList<>(size);
		for (int i = 0; i < size; i++) {
			order.add(i);
		}
		Collections.shuffle(order, new Random(seed(matchId, index)));
		return Collections.unmodifiableList(order);
	}

	public record MatchPermutations(List<Integer> left, List<Integer> right) {
	}

	public static MatchPermutations matchPermutations(long matchId, int index, int size) {
		List<Integer> left = new ArrayList<>(size);
		List<Integer> right = new ArrayList<>(size);
		for (int i = 0; i < size; i++) {
			left.add(i);
			right.add(i);
		}
		Random rnd = new Random(seed(matchId, index));
		Collections.shuffle(left, rnd);
		Collections.shuffle(right, rnd);
		return new MatchPermutations(Collections.unmodifiableList(left), Collections.unmodifiableList(right));
	}

}
