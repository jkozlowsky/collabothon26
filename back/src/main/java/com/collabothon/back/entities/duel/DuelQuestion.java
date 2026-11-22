package com.collabothon.back.entities.duel;

import java.util.List;

import tools.jackson.databind.node.ObjectNode;

/**
 * A duel question from {@code content/duel/<story>.json}: content, not a JPA entity. {@code step} is a lesson-format
 * step including its answer fields; {@code timeLimitMs} overrides the computed time limit when set.
 */
public record DuelQuestion(
		String id,
		String lessonId,
		String sourceStepId,
		List<String> concepts,
		Long timeLimitMs,
		String category,
		ObjectNode step
) {

	public DuelQuestion(String id, String lessonId, Long timeLimitMs, String category, ObjectNode step) {
		this(id, lessonId, null, List.of(), timeLimitMs, category, step);
	}

	public DuelQuestion withCategory(String newCategory) {
		return new DuelQuestion(id, lessonId, sourceStepId, concepts, timeLimitMs, newCategory, step);
	}

	public String type() {
		return step.path("type").asString();
	}

}
