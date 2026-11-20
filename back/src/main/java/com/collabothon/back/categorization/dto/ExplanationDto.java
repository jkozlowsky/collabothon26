package com.collabothon.back.categorization.dto;

import java.util.List;
import java.util.Map;

import com.collabothon.back.categorization.enums.ExplanationOutput;

public record ExplanationDto(ExplanationOutput output, Map<String, Double> probabilities, List<String> because) {
}
