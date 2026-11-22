package com.collabothon.back.categorization.enums;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonValue;

import com.collabothon.back.categorization.services.Story;

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

	/** The area a story teaches: the one place the {@code area} names of stories.json are read. */
	public static FocusArea ofStoryArea(String storyArea) {
		return switch (storyArea) {
			case "Saving", "Money basics" -> SAVING;
			case "Borrowing" -> DEBT;
			// The "Risk" path is about investing risk (hype, leverage, spreading), so the test rates it with investing.
			case "Investing", "Risk" -> INVESTING;
			default -> throw new IllegalStateException("No focus area for the story area " + storyArea);
		};
	}

	/** The areas of the picked paths, in the order the user picked them. */
	public static List<FocusArea> fromInterests(List<String> storyIds, List<Story> stories) {
		return Story.picked(storyIds, stories).stream()
			.map(story -> ofStoryArea(story.area()))
			.distinct()
			.toList();
	}

}
