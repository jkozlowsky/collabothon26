package com.collabothon.back.lesson.models;

import java.util.List;

import com.collabothon.back.lesson.consts.LessonConsts;

import tools.jackson.databind.JsonNode;

// rawNode is passed through to the API, which shows fields the backend does not read.
public record Story(
		String id,
		String area,
		String category,
		String city,
		String topic,
		String status,
		String icon,
		String color,
		List<String> lessonIds,
		String duelFallback,
		JsonNode rawNode) {

	public String areaSlug() {
		return LessonConsts.WHITESPACE.matcher(area.trim().toLowerCase()).replaceAll("-");
	}

}
