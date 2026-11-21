package com.collabothon.back.categorization.enums;

import static com.collabothon.back.categorization.consts.CategorizationConsts.CHIP_FAIRLY_SURE;
import static com.collabothon.back.categorization.consts.CategorizationConsts.CHIP_GUESSING;
import static com.collabothon.back.categorization.consts.CategorizationConsts.CHIP_SURE;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** The chip after a knowledge answer, lowest first. */
@RequiredArgsConstructor
@Getter
public enum Confidence {

	GUESSING("Guessing", CHIP_GUESSING),
	FAIRLY_SURE("Fairly sure", CHIP_FAIRLY_SURE),
	SURE("Sure", CHIP_SURE);

	private final String label;

	private final double chip;

	@JsonValue
	public String wire() {
		return WireNames.of(this);
	}

}
