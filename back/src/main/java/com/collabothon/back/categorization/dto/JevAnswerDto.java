package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.Confidence;
import com.collabothon.back.categorization.enums.FocusArea;

// One knowledge answer as Jev sees it: bank text and labels only, never what the user typed or their numbers.
public record JevAnswerDto(
		FocusArea area,
		AnswerResult result,
		String misconception,
		Confidence confidence
) {}
