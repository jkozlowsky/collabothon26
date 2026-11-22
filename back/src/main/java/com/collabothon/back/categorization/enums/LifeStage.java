package com.collabothon.back.categorization.enums;

import java.util.Arrays;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.profile.consts.ProfileConsts;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum LifeStage {

	STUDENT(ProfileConsts.LIFE_STAGE_STARTING_OUT),
	FAMILY(ProfileConsts.LIFE_STAGE_BUILDING),
	ESTABLISHED(ProfileConsts.LIFE_STAGE_SETTLED),
	PRE_RETIREMENT(ProfileConsts.LIFE_STAGE_LATER_LIFE);

	private final String answer;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

	// Only the clear ends of the range: no family status is inferred from an age band (GDPR accuracy).
	public static LifeStage fromAgeBand(String ageBand) {
		return switch (ageBand) {
			case CategorizationConsts.AGE_18_25 -> STUDENT;
			case CategorizationConsts.AGE_60_PLUS -> PRE_RETIREMENT;
			case null, default -> null;
		};
	}

	// A skipped answer stays null; an unknown one is an error, never a silent mapping.
	public static LifeStage fromAnswer(String answer) {
		if (answer == null) {
			return null;
		}
		return Arrays.stream(values())
			.filter(stage -> stage.answer.equals(answer))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown life stage: " + answer));
	}

}
