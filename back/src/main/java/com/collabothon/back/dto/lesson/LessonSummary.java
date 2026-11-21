package com.collabothon.back.dto.lesson;

public record LessonSummary(String id, String story, String title, String place, String topic, int minutes, int xp,
		String status) {
}
