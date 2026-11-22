package com.collabothon.back.categorization.models;

import java.util.List;
import java.util.Map;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;

// No lessons means there is nothing to choose, so first_lesson is not asked.
public record JevQuickCheck(
		ProfileRangesDto profile,
		List<JevAnswerDto> answers,
		List<CheckLesson> lessons,
		Map<String, String> interestNotes
) {}
