package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.ExplanationConsts.BUFFER_WORDS;
import static com.collabothon.back.categorization.consts.ExplanationConsts.HOLDS_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.LOAN_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.NEUTRAL_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.NO_HOLDS_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.NO_SAVES_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.OVERDRAFT_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.OVERSPENT_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.RETIREMENT_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.SAVES_LINE;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_6_PLUS;
import static com.collabothon.back.categorization.consts.FactsConsts.RATE_NEGATIVE;
import static com.collabothon.back.categorization.consts.FactsConsts.SHORT_BUFFERS;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import com.collabothon.back.categorization.dto.ExplanationDto;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.enums.Experience;
import com.collabothon.back.categorization.enums.ExplanationOutput;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.models.Judgement;
import com.collabothon.back.categorization.models.Learner;

final class ExplanationRules {

	static List<ExplanationDto> explanation(Judgement judgement, Learner learner) {
		return List.of(
				new ExplanationDto(ExplanationOutput.ROLE, judgement.roleProbabilities(), roleBecause(learner)),
				new ExplanationDto(ExplanationOutput.FOCUS_AREAS, judgement.focusProbabilities(),
						focusBecause(judgement.focusAreas(), learner)));
	}

	static List<String> roleBecause(Learner learner) {
		List<String> lines = new ArrayList<>();
		Experience said = Experience.fromWire(learner.onboarding().experience());
		if (said != null) {
			lines.add(said.saidLine());
		}
		FactsDto facts = learner.facts();
		if (facts != null) {
			lines.add(savesLine(facts));
			lines.add(holdsLine(facts));
		}
		return lines;
	}

	static List<String> focusBecause(List<FocusArea> areas, Learner learner) {
		Set<String> lines = new LinkedHashSet<>();
		for (FocusArea area : areas) {
			lines.addAll(supportingLines(area, learner));
		}
		return List.copyOf(lines);
	}

	// Only what argues for the area; a fact that argues against it is left out.
	private static List<String> supportingLines(FocusArea area, Learner learner) {
		List<String> lines = new ArrayList<>();
		if (area == FocusArea.RETIREMENT && saidRetirementIsClose(learner)) {
			lines.add(RETIREMENT_LINE);
		}
		FactsDto facts = learner.facts();
		if (facts != null) {
			lines.addAll(accountLines(area, facts));
		}
		learner.picked().stream()
			.filter(story -> FocusArea.ofStoryArea(story.area()) == area)
			.forEach(story -> lines.add("You said " + story.area() + " is new to you."));
		if (lines.isEmpty()) {
			return List.of(NEUTRAL_LINE);
		}
		return lines;
	}

	private static boolean saidRetirementIsClose(Learner learner) {
		return LifeStage.fromAnswer(learner.onboarding().lifeStage()) == LifeStage.PRE_RETIREMENT;
	}

	private static List<String> accountLines(FocusArea area, FactsDto facts) {
		return switch (area) {
			case SAVING -> savingLines(facts);
			case DEBT -> debtLines(facts);
			case INVESTING -> investingLines(facts);
			case RISK -> riskLines(facts);
			case RETIREMENT -> List.of();
		};
	}

	private static List<String> savingLines(FactsDto facts) {
		List<String> lines = new ArrayList<>();
		if (SHORT_BUFFERS.contains(facts.cashBufferMonths())) {
			lines.add(bufferLine(facts));
		}
		if (RATE_NEGATIVE.equals(facts.savingsRate())) {
			lines.add(OVERSPENT_LINE);
		}
		return lines;
	}

	private static List<String> debtLines(FactsDto facts) {
		List<String> lines = new ArrayList<>();
		if (facts.inOverdraft()) {
			lines.add(OVERDRAFT_LINE);
		}
		if (facts.hasLoan()) {
			lines.add(LOAN_LINE);
		}
		return lines;
	}

	private static List<String> investingLines(FactsDto facts) {
		List<String> lines = new ArrayList<>();
		if (!facts.holdsInvestments()) {
			lines.add(NO_HOLDS_LINE);
		}
		if (BUFFER_6_PLUS.equals(facts.cashBufferMonths())) {
			lines.add(bufferLine(facts));
		}
		return lines;
	}

	private static List<String> riskLines(FactsDto facts) {
		if (facts.holdsInvestments()) {
			return List.of(HOLDS_LINE);
		}
		return List.of();
	}

	private static String savesLine(FactsDto facts) {
		if (facts.savesRegularly()) {
			return SAVES_LINE;
		}
		return NO_SAVES_LINE;
	}

	private static String holdsLine(FactsDto facts) {
		if (facts.holdsInvestments()) {
			return HOLDS_LINE;
		}
		return NO_HOLDS_LINE;
	}

	static String bufferLine(FactsDto facts) {
		String words = Objects.requireNonNull(BUFFER_WORDS.get(facts.cashBufferMonths()));
		return "Your accounts cover " + words + " of spending.";
	}

}
