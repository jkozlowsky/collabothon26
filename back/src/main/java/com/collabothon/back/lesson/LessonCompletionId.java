package com.collabothon.back.lesson;

import java.io.Serializable;

public record LessonCompletionId(
		String userId,
		String lessonId
) implements Serializable {}
