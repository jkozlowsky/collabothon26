package com.collabothon.back.categorization.services;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;

record StoryPlan(
		Story start,
		FocusArea area,
		boolean readyForNext,
		List<String> pathStoryIds
) {}
