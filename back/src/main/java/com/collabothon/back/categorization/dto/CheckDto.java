package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.CheckResult;
import com.collabothon.back.categorization.enums.FocusArea;

public record CheckDto(
		String questionId,
		FocusArea area,
		Long lessonId,
		CheckResult result
) {}
