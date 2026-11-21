package com.collabothon.back.categorization.services;

import java.util.List;

record LessonPlan(
		BankLesson start,
		boolean readyForNext,
		List<Long> pathLessonIds
) {}
