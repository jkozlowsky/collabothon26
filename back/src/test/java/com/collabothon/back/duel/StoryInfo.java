package com.collabothon.back.duel;

import java.util.List;

record StoryInfo(
		String id,
		String category,
		List<String> lessonIds
) {}
