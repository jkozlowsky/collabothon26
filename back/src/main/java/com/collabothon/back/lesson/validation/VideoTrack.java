package com.collabothon.back.lesson.validation;

import java.util.List;
import java.util.Map;

import tools.jackson.databind.JsonNode;

record VideoTrack(
		Map<String, JsonNode> stepsById,
		Map<String, JsonNode> scenesById,
		JsonNode scenes,
		List<String> beats) {}
