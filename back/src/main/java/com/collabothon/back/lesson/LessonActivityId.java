package com.collabothon.back.lesson;

import java.io.Serializable;
import java.time.LocalDate;

public record LessonActivityId(
		String userId,
		LocalDate completedOn
) implements Serializable {}
