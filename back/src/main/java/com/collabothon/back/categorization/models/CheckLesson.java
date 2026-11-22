package com.collabothon.back.categorization.models;

import static com.collabothon.back.categorization.consts.CategorizationConsts.LABEL_EDGE_PATTERN;
import static com.collabothon.back.categorization.consts.CategorizationConsts.LABEL_SEPARATOR;
import static com.collabothon.back.categorization.consts.CategorizationConsts.NOT_IN_LABEL_PATTERN;

import java.util.List;
import java.util.Locale;

import com.collabothon.back.categorization.enums.FocusArea;

public record CheckLesson(
		String id,
		String storyId,
		FocusArea area,
		String topic,
		List<String> concepts
) {

	// Jev's option name for the lesson: a name that describes the content, not an id.
	public String label() {
		return topic.toLowerCase(Locale.ROOT)
			.replaceAll(NOT_IN_LABEL_PATTERN, LABEL_SEPARATOR)
			.replaceAll(LABEL_EDGE_PATTERN, "");
	}

}
