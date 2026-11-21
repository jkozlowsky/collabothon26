package com.collabothon.back.duel;

enum DuelLang {

	EN, PL;

	/** Unknown or missing codes fall back to English. */
	static DuelLang from(String value) {
		return "pl".equalsIgnoreCase(value) ? PL : EN;
	}

}
