package com.collabothon.back.duel.demo;

public enum RiskQuestions {

	RANDOM,
	FIXED_FOR_DEMO;

	public boolean areFixedFor(String category) {
		return this == FIXED_FOR_DEMO && DuelDemoConsts.RISK_CATEGORY.equals(category);
	}

}
