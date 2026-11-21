package com.collabothon.back.categorization.enums;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;

public enum FocusArea {

	// Goal groups from main's onboarding (front/src/constants/onboarding.ts).
	SAVING("Saving", "budget", "money-habits", "banking-basics", "start-saving", "emergency-fund", "inflation"),
	DEBT("Borrowing", "pay-off-debt", "credit-cards", "loans-mortgages"),
	INVESTING("Investing", "start-investing", "stocks-etfs", "crypto"),
	RISK("Risk", "insurance", "scams"),
	RETIREMENT("Retirement", "retirement");

	@Getter
	private final String label;

	private final Set<String> goals;

	FocusArea(String label, String... goals) {
		this.label = label;
		this.goals = Set.of(goals);
	}

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

	public String jevQuestion() {
		return "focus_" + wire();
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

	/** The areas the goals point to, in the order the user picked them. */
	public static List<FocusArea> fromGoals(List<String> goals) {
		return goals.stream()
			.flatMap(goal -> Arrays.stream(values()).filter(area -> area.goals.contains(goal)))
			.distinct()
			.toList();
	}

}
