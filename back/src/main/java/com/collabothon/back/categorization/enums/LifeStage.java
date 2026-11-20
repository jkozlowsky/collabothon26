package com.collabothon.back.categorization.enums;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum LifeStage {

	STUDENT("starting-out"), FAMILY("building"), ESTABLISHED("settled"), PRE_RETIREMENT("later-life");

	/** The onboarding answer (main's {@code user_profile.life_stage}) this stage comes from. */
	private final String answer;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

	/** Null stays null; an unknown answer is an error, never a silent mapping. */
	public static LifeStage fromAnswer(String answer) {
		return answer == null ? null : Arrays.stream(values())
			.filter(stage -> stage.answer.equals(answer))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown life stage: " + answer));
	}

}
