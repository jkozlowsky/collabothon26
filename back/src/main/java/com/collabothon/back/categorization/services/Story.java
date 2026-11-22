package com.collabothon.back.categorization.services;

import java.util.List;

/** A story from {@code stories.json}, its lessons in story order. */
public record Story(
		String id,
		String category,
		String city,
		String topic,
		String area,
		List<String> lessonIds
) {

	public static List<Story> picked(List<String> storyIds, List<Story> stories) {
		return storyIds.stream().flatMap(id -> stories.stream().filter(story -> story.id().equals(id))).toList();
	}

}
