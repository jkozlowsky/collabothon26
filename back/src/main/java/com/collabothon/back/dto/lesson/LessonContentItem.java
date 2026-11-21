package com.collabothon.back.dto.lesson;

import java.util.List;
import tools.jackson.databind.node.ObjectNode;

public record LessonContentItem(
		String id,
		String story,
		String title,
		String place,
		String topic,
		int minutes,
		int xp,
		List<String> concepts,
		ObjectNode node
) {
}
