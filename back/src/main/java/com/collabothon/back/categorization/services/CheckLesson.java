package com.collabothon.back.categorization.services;

import java.util.List;
import java.util.Locale;

import com.collabothon.back.categorization.enums.FocusArea;

/** A lesson with at least one quiz step. */
public record CheckLesson(
		String id,
		String storyId,
		FocusArea area,
		String topic,
		List<String> concepts
) {

	/** Jev's option name for the lesson: its topic in snake case, unique in the pool. */
	public String label() {
		return topic.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
	}

}
