package com.collabothon.back.dto.lesson;

public record LessonSummary(String id, String story, String title, String place, String topic, int minutes, int xp,
		String status, VideoSummary video) {

	/** Set on a summary when the lesson has a video track. */
	public record VideoSummary(int minutes) {
	}

}
