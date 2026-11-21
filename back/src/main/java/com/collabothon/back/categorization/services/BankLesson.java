package com.collabothon.back.categorization.services;

import com.collabothon.back.categorization.enums.FocusArea;

/** A lesson with bank questions; its area is the area of its lowest-id question. */
public record BankLesson(
		String id,
		FocusArea area
) {}
