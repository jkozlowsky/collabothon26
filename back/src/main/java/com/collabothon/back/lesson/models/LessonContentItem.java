package com.collabothon.back.lesson.models;

import tools.jackson.databind.node.ObjectNode;

import com.collabothon.back.dto.lesson.VideoSummary;

public record LessonContentItem(
		String id,
		String story,
		String title,
		String place,
		String topic,
		int minutes,
		int xp,
		VideoSummary video,
		ObjectNode node) {}
