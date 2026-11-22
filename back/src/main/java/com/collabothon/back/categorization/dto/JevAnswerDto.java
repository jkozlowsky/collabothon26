package com.collabothon.back.categorization.dto;

import java.util.List;

import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.FocusArea;

/** One knowledge answer as Jev sees it: the lesson it came from, what that lesson teaches, and how it went. */
public record JevAnswerDto(
		FocusArea area,
		String lessonId,
		String topic,
		List<String> concepts,
		AnswerResult result
) {}
