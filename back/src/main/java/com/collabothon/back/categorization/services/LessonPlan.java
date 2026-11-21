package com.collabothon.back.categorization.services;

import java.util.List;

/** {@code start} null = nothing left to start. */
record LessonPlan(
		BankLesson start,
		boolean readyForNext,
		List<Long> pathLessonIds
) {}
