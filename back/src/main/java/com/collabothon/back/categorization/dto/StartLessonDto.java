package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.FocusArea;

public record StartLessonDto(
		String lessonId,
		String title,
		FocusArea area,
		String storyId,
		String storyCity
) {}
