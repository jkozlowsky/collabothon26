package com.collabothon.back.categorization.dto;

import java.util.List;

import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.FocusArea;

// Serialised verbatim to Jev, so the component order is part of the request.
public record JevAnswerDto(
		FocusArea area,
		String lessonId,
		String topic,
		List<String> concepts,
		AnswerResult result
) {}
