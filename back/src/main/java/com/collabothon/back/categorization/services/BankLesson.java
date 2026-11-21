package com.collabothon.back.categorization.services;

import com.collabothon.back.categorization.enums.FocusArea;

/** A lesson with bank questions; its area is the area of its lowest-id question. */
record BankLesson(
		Long id,
		String title,
		String summary,
		int position,
		FocusArea area
) {}
