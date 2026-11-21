package com.collabothon.back.categorization.enums;

import java.util.Arrays;

import com.collabothon.back.categorization.consts.CategorizationConsts;
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

	/** Only the clear ends of the range (D1); no family status is inferred from an age band. */
	public static LifeStage fromAgeBand(String ageBand) {
		if (CategorizationConsts.AGE_18_25.equals(ageBand)) {
			return STUDENT;
		}
		return CategorizationConsts.AGE_60_PLUS.equals(ageBand) ? PRE_RETIREMENT : null;
	}

	/** Null stays null; an unknown answer is an error, never a silent mapping. */
	public static LifeStage fromAnswer(String answer) {
		return answer == null ? null : Arrays.stream(values())
			.filter(stage -> stage.answer.equals(answer))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown life stage: " + answer));
	}

}
