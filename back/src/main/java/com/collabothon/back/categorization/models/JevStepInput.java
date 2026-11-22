package com.collabothon.back.categorization.models;

import java.util.List;

import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.JevInterestDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.enums.FocusArea;

public record JevStepInput(
		ProfileRangesDto profile,
		List<JevInterestDto> interests,
		FactsDto facts,
		List<JevAnswerDto> answers,
		List<FocusArea> answeredAreas,
		List<CheckLesson> lessons
) {}
