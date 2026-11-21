package com.collabothon.back.dto.profile;

import java.util.List;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record OnboardingRequest(
		@Pattern(regexp = "starting-out|building|settled|later-life") String lifeStage,
		@NotNull List<@NotNull @Pattern(regexp = GOALS) String> goals,
		@Pattern(regexp = "not-saving|occasional|regular|investing|planning") String experience,
		boolean skipped) {

	public static final String GOALS = "budget|money-habits|banking-basics|start-saving|emergency-fund|inflation"
			+ "|pay-off-debt|credit-cards|loans-mortgages|start-investing|stocks-etfs|crypto"
			+ "|retirement|insurance|scams";
}
