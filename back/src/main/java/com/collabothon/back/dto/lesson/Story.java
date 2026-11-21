package com.collabothon.back.dto.lesson;

import java.util.List;
import tools.jackson.databind.JsonNode;

public record Story(
		String id,
		String category,
		String city,
		String topic,
		String status,
		Pin pin,
		String icon,
		String color,
		Landmark landmark,
		StoryCharacter character,
		String intro,
		List<Word> words,
		Currency currency,
		List<String> lessonIds,
		JsonNode rawNode
) {

	public record Pin(double lat, double lng) {
	}

	public record Landmark(String kind, double at) {
	}

	public record StoryCharacter(String name, int age, String role, String place, String savings) {
	}

	public record Word(String nativeWord, String meaning) {
	}

	public record Currency(String code, double perEur) {
	}
}
