package com.collabothon.back.categorization.enums;

import java.util.Locale;

public final class WireNames {

	/** How every enum here is spelled on the wire: lower case, dashes for underscores. */
	public static String of(Enum<?> value) {
		return value.name().toLowerCase(Locale.ROOT).replace('_', '-');
	}

}
