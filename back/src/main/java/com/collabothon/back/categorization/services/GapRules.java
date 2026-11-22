package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.ExplanationConsts.HOLDS_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.NO_HOLDS_LINE;
import static com.collabothon.back.categorization.consts.ExplanationConsts.SAVES_LINE;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_UNDER_1;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.GapDto;
import com.collabothon.back.categorization.enums.Experience;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.Learner;
import com.collabothon.back.categorization.models.Measurement;

final class GapRules {

	private static final Set<Experience> SAYS_LITTLE_SAVING = EnumSet.of(Experience.NOT_SAVING,
			Experience.OCCASIONAL);

	private static final Set<Experience> SAYS_INVESTING = EnumSet.of(Experience.INVESTING, Experience.PLANNING);

	static Map<FocusArea, GapDirection> measuredGaps(Measurement measurement, FactsDto facts) {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		for (FocusArea area : measurement.order()) {
			measuredGap(area, measurement.inArea(area), facts).ifPresent(direction -> gaps.put(area, direction));
		}
		return gaps;
	}

	// Only saving and investing have a habit in the facts.
	static Optional<GapDirection> measuredGap(FocusArea area, List<Answer> inArea, FactsDto facts) {
		if (facts == null || inArea.isEmpty()) {
			return Optional.empty();
		}
		boolean allRight = inArea.stream().allMatch(Answer::isCorrect);
		return switch (area) {
			case SAVING -> habitAgainstAnswers(facts.savesRegularly(), allRight);
			case INVESTING -> habitAgainstAnswers(facts.holdsInvestments(), allRight);
			case DEBT, RISK, RETIREMENT -> Optional.empty();
		};
	}

	private static Optional<GapDirection> habitAgainstAnswers(boolean habit, boolean allRight) {
		if (habit && !allRight) {
			return Optional.of(GapDirection.HABIT_AHEAD);
		}
		if (!habit && allRight) {
			return Optional.of(GapDirection.KNOWLEDGE_AHEAD);
		}
		return Optional.empty();
	}

	// The start lesson's area first; the sort is stable, so the others keep the area order.
	static List<GapDto> gapCards(Map<FocusArea, GapDirection> gaps, FocusArea startArea) {
		return gaps.entrySet().stream()
			.sorted(Comparator.comparing(gap -> gap.getKey() != startArea))
			.limit(CategorizationConsts.MAX_GAP_CARDS)
			.map(gap -> new GapDto(gap.getKey(), gap.getValue(), because(gap.getKey(), gap.getValue(), startArea)))
			.toList();
	}

	private static String because(FocusArea area, GapDirection direction, FocusArea startArea) {
		return switch (direction) {
			case HABIT_AHEAD -> "Your account shows you %s. Your %s answers leave a few things %s"
				.formatted(habitShown(area), area.getLabel(), openEnding(area, startArea));
			case KNOWLEDGE_AHEAD -> "Your %s answers show you understand how it works. Your account shows %s."
				.formatted(area.getLabel(), habitMissing(area));
		};
	}

	private static String habitShown(FocusArea area) {
		if (area == FocusArea.SAVING) {
			return "move money to savings every month";
		}
		return "already invest";
	}

	private static String habitMissing(FocusArea area) {
		if (area == FocusArea.SAVING) {
			return "no monthly transfer to savings";
		}
		return "no investment products";
	}

	private static String openEnding(FocusArea area, FocusArea startArea) {
		if (area == startArea) {
			return "open, which is where your first lesson starts.";
		}
		return "open to explore.";
	}

	// Without a Quick check: what the user said against what the account shows.
	static List<GapDto> saidGaps(Learner learner) {
		Experience said = Experience.fromWire(learner.onboarding().experience());
		FactsDto facts = learner.facts();
		if (said == null || facts == null) {
			return List.of();
		}
		return Stream.of(savingGap(said, facts), investingGap(said, facts)).flatMap(Optional::stream).toList();
	}

	private static Optional<GapDto> savingGap(Experience said, FactsDto facts) {
		boolean saysLittle = SAYS_LITTLE_SAVING.contains(said);
		if (saysLittle && facts.savesRegularly()) {
			return Optional.of(saidGap(FocusArea.SAVING, GapDirection.HABIT_AHEAD, said, SAVES_LINE));
		}
		if (!saysLittle && BUFFER_UNDER_1.equals(facts.cashBufferMonths())) {
			return Optional.of(saidGap(FocusArea.SAVING, GapDirection.KNOWLEDGE_AHEAD, said,
					ExplanationRules.bufferLine(facts)));
		}
		return Optional.empty();
	}

	private static Optional<GapDto> investingGap(Experience said, FactsDto facts) {
		boolean saysInvesting = SAYS_INVESTING.contains(said);
		if (!saysInvesting && facts.holdsInvestments()) {
			return Optional.of(saidGap(FocusArea.INVESTING, GapDirection.HABIT_AHEAD, said, HOLDS_LINE));
		}
		if (saysInvesting && !facts.holdsInvestments()) {
			return Optional.of(saidGap(FocusArea.INVESTING, GapDirection.KNOWLEDGE_AHEAD, said, NO_HOLDS_LINE));
		}
		return Optional.empty();
	}

	private static GapDto saidGap(FocusArea area, GapDirection direction, Experience said, String shows) {
		return new GapDto(area, direction, said.saidLine() + " " + shows);
	}

}
