package com.collabothon.back.dto.duel;

import com.fasterxml.jackson.annotation.JsonInclude;

import tools.jackson.databind.node.ObjectNode;

public record ReviewItemDto(
		int index,
		String category,
		ObjectNode step,
		@JsonInclude(JsonInclude.Include.ALWAYS)
		DuelAnswerDto yourAnswer,
		boolean correct,
		String lessonId,
		String lessonTitle
) {}
