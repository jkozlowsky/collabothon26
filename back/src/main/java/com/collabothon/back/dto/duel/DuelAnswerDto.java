package com.collabothon.back.dto.duel;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DuelAnswerDto(
		Integer option,
		Double value,
		List<Integer> buckets,
		List<Integer> pairs
) {}
