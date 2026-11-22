package com.collabothon.back.categorization.models;

import java.util.Map;

public record JevChoice<T>(
		T value,
		Map<String, Double> probabilities
) {}
