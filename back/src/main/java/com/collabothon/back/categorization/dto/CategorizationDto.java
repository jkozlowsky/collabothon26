package com.collabothon.back.categorization.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.collabothon.back.categorization.enums.CategorizationSource;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;

import lombok.With;

/** Stored as JSONB; rows from before the Quick check read with the defaults below. {@code startHere} is never stored. */
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
		mastery = mastery == null ? Map.of() : mastery;
		gaps = gaps == null ? List.of() : gaps;
		answerCount = answerCount == null ? 0 : answerCount;
		readyForNext = Boolean.TRUE.equals(readyForNext);
		pathStoryIds = pathStoryIds == null ? List.of() : pathStoryIds;
	}

}
