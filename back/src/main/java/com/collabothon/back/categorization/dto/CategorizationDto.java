package com.collabothon.back.categorization.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;

import lombok.Builder;
import lombok.With;

// Stored as JSONB: the component order is the JSON order; the defaults read rows from before the Quick check.
@Builder
public record CategorizationDto(
		String userId,
		boolean consent,
		boolean bankData,
		Role role,
		LifeStage lifeStage,
		List<FocusArea> focusAreas,
		List<GapDto> gaps,
		LessonVariantDto lessonVariant,
		List<ExplanationDto> explanation,
		ProfileRangesDto profile,
		Map<String, Double> mastery,
		Integer answerCount,
		StartLessonDto startLesson,
		Boolean readyForNext,
		List<String> pathStoryIds,
		@With
		StartLessonDto startHere,
		SharedWithModelDto sharedWithModel,
		CategorizationSource source,
		String model,
		Instant categorizedAt
) {

	public CategorizationDto {
		mastery = Objects.requireNonNullElse(mastery, Map.of());
		gaps = Objects.requireNonNullElse(gaps, List.of());
		answerCount = Objects.requireNonNullElse(answerCount, 0);
		readyForNext = Boolean.TRUE.equals(readyForNext);
		pathStoryIds = Objects.requireNonNullElse(pathStoryIds, List.of());
	}

}
