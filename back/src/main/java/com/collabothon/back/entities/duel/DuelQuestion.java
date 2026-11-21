package com.collabothon.back.entities.duel;

import tools.jackson.databind.node.ObjectNode;

/**
 * A duel question from {@code content/duel/<story>.json}: content, not a JPA entity. {@code step} is a lesson-format
 * step including its answer fields; {@code timeLimitMs} overrides the computed time limit when set.
 */
public record DuelQuestion(
		String id,
		String lessonId,
		Long timeLimitMs,
		String category,
		ObjectNode step
) {

	public String type() {
		return step.path("type").asString();
	}

}
