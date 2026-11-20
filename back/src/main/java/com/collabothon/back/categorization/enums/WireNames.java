package com.collabothon.back.categorization.enums;

import java.util.Locale;

public final class WireNames {

	public static String of(Enum<?> value) {
		return value.name().toLowerCase(Locale.ROOT).replace('_', '-');
	}

}
