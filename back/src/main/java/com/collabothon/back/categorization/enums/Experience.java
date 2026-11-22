package com.collabothon.back.categorization.enums;

import java.util.Arrays;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum Experience {

	NOT_SAVING("I don't save yet"), OCCASIONAL("I save now and then"), REGULAR("I save regularly"),
	INVESTING("I save and invest"), PLANNING("I plan my finances ahead");

	@Getter
	private final String label;

	public static Experience fromWire(String value) {
		if (value == null) {
			return null;
		}
		return Arrays.stream(values())
			.filter(experience -> WireNames.of(experience).equals(value))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown experience: " + value));
	}

	public String saidLine() {
		return "You said: " + label + ".";
	}

}
