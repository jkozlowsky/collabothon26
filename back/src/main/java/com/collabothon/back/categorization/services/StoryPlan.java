package com.collabothon.back.categorization.services;

import java.util.List;

record StoryPlan(
		Story start,
		boolean readyForNext,
		List<String> pathStoryIds
) {}
