package com.collabothon.back.categorization.dto;

import java.util.Map;

import tools.jackson.databind.JsonNode;

public record JevRequestDto(String model, Map<String, Object> state, JsonNode questions) {
}
