package com.collabothon.back.entities.duel;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Exactly one field is set, depending on the step type. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChosenAnswer(
		Integer option,
		Double value,
		List<Integer> buckets,
		List<Integer> pairs
) {}
