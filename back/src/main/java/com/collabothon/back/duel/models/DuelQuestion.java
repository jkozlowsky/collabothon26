package com.collabothon.back.duel.models;

import java.util.List;

import tools.jackson.databind.node.ObjectNode;

/** A question from {@code content/duel}; {@code step} still holds its answer fields. */
public record DuelQuestion(
		String id,
		String lessonId,
		String sourceStepId,
		List<String> concepts,
		Long timeLimitMs,
		String category,
		ObjectNode step
) {

	public DuelQuestion withCategory(String newCategory) {
		return new DuelQuestion(id, lessonId, sourceStepId, concepts, timeLimitMs, newCategory, step);
	}

	public String type() {
		return step.path("type").asString();
	}

}
