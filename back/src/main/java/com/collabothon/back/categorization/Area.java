package com.collabothon.back.categorization;

import static com.collabothon.back.categorization.Facts.BUFFER_6_PLUS;
import static com.collabothon.back.categorization.Facts.RATE_NEGATIVE;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import com.collabothon.back.categorization.Categorization.LifeStage;
import com.collabothon.back.categorization.Categorization.OnboardingAnswers;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Area {

	// Goal groups from main's onboarding (front/src/constants/onboarding.ts).
	SAVING("budget", "money-habits", "banking-basics", "start-saving", "emergency-fund", "inflation"),
	DEBT("pay-off-debt", "credit-cards", "loans-mortgages"),
	INVESTING("start-investing", "stocks-etfs", "crypto"),
	RISK("insurance", "scams"),
	RETIREMENT("retirement");

	private final Set<String> goals;

	Area(String... goals) {
		this.goals = Set.of(goals);
	}

	@JsonValue
	public String wire() {
		return Categorization.wireName(this);
	}

	String jevQuestion() {
		return "focus_" + wire();
	}

	/** The areas the goals point to, in the order the user picked them. */
	static List<Area> fromGoals(List<String> goals) {
		return goals.stream()
			.flatMap(goal -> Arrays.stream(values()).filter(area -> area.goals.contains(goal)))
			.distinct()
			.toList();
	}

	/** Only the lines that argue for this area; a fact that argues against it is left out. */
	List<String> supportingLines(OnboardingAnswers a, Facts f) {
		List<String> lines = new ArrayList<>();
		if (this == RETIREMENT && LifeStage.fromAnswer(a.lifeStage()) == LifeStage.PRE_RETIREMENT) {
			lines.add(Rules.RETIREMENT_LINE);
		}
		if (f == null) {
			return lines;
		}
		switch (this) {
			case SAVING -> {
				if (Rules.hasShortBuffer(f)) {
					lines.add(Rules.bufferLine(f));
				}
				if (f.savingsRate().equals(RATE_NEGATIVE)) {
					lines.add(Rules.OVERSPENT_LINE);
				}
			}
			case DEBT -> {
				if (f.inOverdraft()) {
					lines.add(Rules.OVERDRAFT_LINE);
				}
				if (f.hasLoan()) {
					lines.add(Rules.LOAN_LINE);
				}
			}
			case INVESTING -> {
				if (!f.holdsInvestments()) {
					lines.add(Rules.holdsLine(f));
				}
				if (f.cashBufferMonths().equals(BUFFER_6_PLUS)) {
					lines.add(Rules.bufferLine(f));
				}
			}
			case RISK -> {
				if (f.holdsInvestments()) {
					lines.add(Rules.holdsLine(f));
				}
			}
			case RETIREMENT -> {
			}
		}
		return lines;
	}

}
