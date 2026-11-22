package com.collabothon.back.categorization.services;

import java.util.List;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.enums.FocusArea;

/** What the final call adds when the Quick check ran; {@code lessons} is empty when there is nothing to choose. */
record JevQuickCheck(
		ProfileRangesDto profile,
		List<JevAnswerDto> answers,
		List<FocusArea> gapAreas,
		List<CheckLesson> lessons
) {}
