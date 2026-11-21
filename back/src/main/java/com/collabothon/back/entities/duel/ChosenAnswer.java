package com.collabothon.back.entities.duel;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * What the player submitted for one duel question; exactly one field is set, depending on the step type. Stored as
 * JSON text in {@code duel_answer.chosen_answer} by {@link ChosenAnswerJsonConverter}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChosenAnswer(
		Integer option,
		Double value,
		List<Integer> buckets,
		List<Integer> pairs
) {

	public static ChosenAnswer ofOption(int option) {
		return new ChosenAnswer(option, null, null, null);
	}

	public static ChosenAnswer ofValue(double value) {
		return new ChosenAnswer(null, value, null, null);
	}

	public static ChosenAnswer ofBuckets(List<Integer> buckets) {
		return new ChosenAnswer(null, null, buckets, null);
	}

	public static ChosenAnswer ofPairs(List<Integer> pairs) {
		return new ChosenAnswer(null, null, null, pairs);
	}

}
