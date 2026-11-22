package com.collabothon.back.duel.models;

import java.util.List;

/** The shown order of both columns of a match step, as indexes into its pairs. */
public record MatchPermutations(
		List<Integer> left,
		List<Integer> right
) {}
