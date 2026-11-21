package com.collabothon.back.categorization.services;

import java.util.List;
import java.util.Map;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.enums.FocusArea;

/** What the final call adds when the Quick check ran; {@code stories} (id to topic) is empty below two candidates. */
record JevQuickCheck(
		ProfileRangesDto profile,
		List<String> goals,
		List<JevAnswerDto> answers,
		List<FocusArea> gapAreas,
		Map<String, String> stories
) {}
