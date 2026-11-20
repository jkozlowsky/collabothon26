package com.collabothon.back.categorization.dto;

import java.time.Instant;
import java.util.List;

import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;

public record CategorizationDto(
		String userId,
		boolean consent,
		boolean bankData,
		Role role,
		LifeStage lifeStage,
		List<FocusArea> focusAreas,
		List<ConfidenceGapDto> confidenceGaps,
		LessonVariantDto lessonVariant,
		List<ExplanationDto> explanation,
		SharedWithModelDto sharedWithModel,
		CategorizationSource source,
		String model,
		Instant categorizedAt
) {}
