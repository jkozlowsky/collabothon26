package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;

/** Where the knowledge answers and the account differ in one area. */
public record GapDto(
		FocusArea area,
		GapDirection direction,
		String because
) {}
