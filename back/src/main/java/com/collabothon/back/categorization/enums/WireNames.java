package com.collabothon.back.categorization.enums;

import java.util.Arrays;
import java.util.Locale;

public final class WireNames {

	public static String of(Enum<?> value) {
		return value.name().toLowerCase(Locale.ROOT).replace('_', '-');
	}

	public static <E extends Enum<E>> E fromWire(Class<E> type, String wire) {
		return Arrays.stream(type.getEnumConstants())
			.filter(e -> of(e).equals(wire))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown " + type.getSimpleName()));
	}

}
