package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;

public record GapDto(
		FocusArea area,
		GapDirection direction,
		String because
) {}
