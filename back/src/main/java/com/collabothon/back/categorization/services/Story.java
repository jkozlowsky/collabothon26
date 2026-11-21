package com.collabothon.back.categorization.services;

import java.util.List;

/** A story from {@code stories.json}, its lessons in story order. */
public record Story(
		String id,
		String city,
		String topic,
		List<String> lessonIds
) {}
