package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;

public record ConfidenceGapDto(
		FocusArea area,
		GapDirection direction,
		String because
) {}
