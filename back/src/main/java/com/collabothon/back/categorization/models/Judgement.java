package com.collabothon.back.categorization.models;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.Role;

public record Judgement(
		Role role,
		Map<String, Double> roleProbabilities,
		List<FocusArea> focusAreas,
		Map<String, Double> focusProbabilities,
		String model,
		Optional<CheckLesson> firstLesson
) {

	public static Judgement byRules(Role role, List<FocusArea> focusAreas) {
		return new Judgement(role, Map.of(), focusAreas, Map.of(), null, Optional.empty());
	}

}
