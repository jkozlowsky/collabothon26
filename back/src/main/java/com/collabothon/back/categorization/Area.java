package com.collabothon.back.categorization;

import static com.collabothon.back.bank.Facts.BUFFER_6_PLUS;
import static com.collabothon.back.bank.Facts.RATE_NEGATIVE;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import com.collabothon.back.bank.Facts;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Area {

	SAVING("budget", "money-habits", "banking-basics", "start-saving", "emergency-fund", "big-purchase", "buy-home"),
	DEBT("pay-off-debt", "credit-cards", "loans-mortgages"),
	INVESTING("start-investing", "stocks", "etfs", "bonds", "sustainable-investing", "crypto", "inflation"),
	RISK("diversification", "risk", "insurance", "scams"),
	RETIREMENT("retirement", "kids-future", "family-money");

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

	/** Only the facts that argue for this area; a fact that argues against it is left out. */
	List<String> supportingLines(Facts f) {
		List<String> lines = new ArrayList<>();
		switch (this) {
			case SAVING -> {
				if (Rules.hasShortBuffer(f)) {
					lines.add(Rules.bufferLine(f));
				}
				if (f.savingsRate().equals(RATE_NEGATIVE)) {
					lines.add("You spent more than you earned.");
				}
			}
			case DEBT -> {
				if (f.overdraftMonths() > 0) {
					lines.add(Rules.overdraftLine(f));
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
				if (Rules.isAge45Plus(f)) {
					lines.add(Rules.ageLine(f));
				}
			}
		}
		return lines;
	}

}
