package com.collabothon.back.duel;

import java.util.List;

import tools.jackson.databind.JsonNode;

record DuelFileInfo(
		String fileName,
		String story,
		List<JsonNode> questions
) {}
