package com.collabothon.back.categorization.models;

import java.util.List;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.lesson.models.Story;

// No start when every lesson is done; no area when no measured gap picked the start.
public record StoryPlan(
		Story start,
		FocusArea area,
		boolean readyForNext,
		List<String> pathStoryIds
) {}
