package com.collabothon.back.dto.duel;

import java.util.List;

import jakarta.validation.constraints.PositiveOrZero;

import com.collabothon.back.common.validation.UserId;

/** {@code option} for quiz, {@code value} for predict and chart, {@code buckets} for sort, {@code pairs} for match. */
public record AnswerRequest(
		@UserId
		String userId,
		@PositiveOrZero
		int index,
		Integer option,
		Double value,
		List<Integer> buckets,
		List<Integer> pairs
) {}
