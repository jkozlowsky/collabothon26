package com.collabothon.back.dto.duel;

import tools.jackson.databind.node.ObjectNode;

/** A question as sent before answering: the step has its answer fields removed. */
public record DuelQuestionDto(
		int index,
		String category,
		ObjectNode step,
		long deadline,
		long timeLimitMs
) {}
