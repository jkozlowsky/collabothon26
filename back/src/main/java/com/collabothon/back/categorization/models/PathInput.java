package com.collabothon.back.categorization.models;

import java.util.List;
import java.util.Set;

import lombok.With;

import com.collabothon.back.lesson.models.Story;

// The lessons list the picked stories' first: every rule takes the first of an area, so that order is their priority.
public record PathInput(
		List<Story> stories,
		List<Story> picked,
		List<CheckLesson> lessons,
		Set<String> completed,
		@With
		Measurement measurement
) {}
