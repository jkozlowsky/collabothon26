package com.collabothon.back.categorization.enums;

import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum FocusArea {

	SAVING("Saving"),
	DEBT("Borrowing"),
	INVESTING("Investing"),
	RISK("Risk"),
	RETIREMENT("Retirement");

	@Getter
	private final String label;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

	// Keeps null values: an area without an answer is still a key.
	public static Map<String, Double> byWire(Map<FocusArea, Double> values) {
		Map<String, Double> wire = new LinkedHashMap<>();
		values.forEach((area, value) -> wire.put(area.wire(), value));
		return wire;
	}

	// The one place the area names of stories.json are read.
	public static FocusArea ofStoryArea(String storyArea) {
		return switch (storyArea) {
			case "Saving", "Money basics" -> SAVING;
			case "Borrowing" -> DEBT;
			// The "Risk" path is about investing risk (hype, leverage, spreading), so the test rates it with investing.
			case "Investing", "Risk" -> INVESTING;
			default -> throw new IllegalStateException("No focus area for the story area " + storyArea);
		};
	}

}
