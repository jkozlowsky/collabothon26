package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.models.MatchPermutations;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** The shown order of sort and match steps, rebuilt from (match id, question index) instead of being stored. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class DuelShuffle {

	public static List<Integer> sortPermutation(long matchId, int index, int size) {
		List<Integer> order = indexes(size);
		Collections.shuffle(order, random(matchId, index));
		return Collections.unmodifiableList(order);
	}

	public static MatchPermutations matchPermutations(long matchId, int index, int size) {
		List<Integer> left = indexes(size);
		List<Integer> right = indexes(size);
		Random random = random(matchId, index);
		Collections.shuffle(left, random);
		Collections.shuffle(right, random);
		return new MatchPermutations(Collections.unmodifiableList(left), Collections.unmodifiableList(right));
	}

	private static Random random(long matchId, int index) {
		return new Random(matchId * DuelConsts.SHUFFLE_SEED_MULTIPLIER + index);
	}

	private static List<Integer> indexes(int size) {
		return IntStream.range(0, size).boxed().collect(Collectors.toCollection(ArrayList::new));
	}

}
