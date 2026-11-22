package com.collabothon.back.duel;

import java.util.Set;

record LessonInfo(
		String id,
		String story,
		Set<String> stepIds
) {}
