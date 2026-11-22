package com.collabothon.back.categorization.services;

import java.util.List;
import java.util.Map;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;

/** What the final call adds when the Quick check ran; {@code lessons} is empty when there is nothing to choose. */
record JevQuickCheck(
		ProfileRangesDto profile,
		List<JevAnswerDto> answers,
		List<CheckLesson> lessons,
		Map<String, String> interestNotes
) {}
