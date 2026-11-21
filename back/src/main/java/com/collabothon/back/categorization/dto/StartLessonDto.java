package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.FocusArea;

public record StartLessonDto(
		Long lessonId,
		String title,
		FocusArea area
) {}
