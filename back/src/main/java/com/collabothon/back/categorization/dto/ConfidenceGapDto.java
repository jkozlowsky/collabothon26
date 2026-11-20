package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.ConfidenceArea;
import com.collabothon.back.categorization.enums.GapDirection;

public record ConfidenceGapDto(
		ConfidenceArea area,
		GapDirection direction,
		String because
) {}
