package com.collabothon.back.categorization.enums;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonValue;

public enum FocusArea {

	// Goal groups from main's onboarding (front/src/constants/onboarding.ts).
	SAVING("budget", "money-habits", "banking-basics", "start-saving", "emergency-fund", "inflation"),
	DEBT("pay-off-debt", "credit-cards", "loans-mortgages"),
	INVESTING("start-investing", "stocks-etfs", "crypto"),
	RISK("insurance", "scams"),
	RETIREMENT("retirement");

	private final Set<String> goals;

	FocusArea(String... goals) {
		this.goals = Set.of(goals);
	}

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

	public String jevQuestion() {
		return "focus_" + wire();
	}

	/** The areas the goals point to, in the order the user picked them. */
	public static List<FocusArea> fromGoals(List<String> goals) {
		return goals.stream()
			.flatMap(goal -> Arrays.stream(values()).filter(area -> area.goals.contains(goal)))
			.distinct()
			.toList();
	}

}
