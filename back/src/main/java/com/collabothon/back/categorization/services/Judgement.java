package com.collabothon.back.categorization.services;

import java.util.List;
import java.util.Map;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.Role;

record Judgement(
		Role role,
		Map<String, Double> roleProbabilities,
		List<FocusArea> focusAreas,
		Map<String, Double> focusProbabilities,
		String model,
		Map<FocusArea, GapDirection> gaps,
		String firstStory
) {}
