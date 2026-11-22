package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.CategorizationConsts.FOCUS_THRESHOLD;
import static com.collabothon.back.categorization.consts.CategorizationConsts.JUST_STARTING_BELOW;
import static com.collabothon.back.categorization.consts.CategorizationConsts.SOLID_ABOVE;
import static com.collabothon.back.categorization.consts.FactsConsts.BUFFER_6_PLUS;
import static com.collabothon.back.categorization.consts.FactsConsts.SHORT_BUFFERS;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.LessonVariantDto;
import com.collabothon.back.categorization.enums.Experience;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.LessonLang;
import com.collabothon.back.categorization.enums.LessonLevel;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.Judgement;
import com.collabothon.back.categorization.models.Learner;
import com.collabothon.back.categorization.models.Measurement;

final class CategorizationRules {

	static Judgement fallback(Learner learner, Measurement measurement) {
		Role role = ruleRole(learner, measurement);
		return Judgement.byRules(role, fallbackFocus(learner, role));
	}

	private static Role ruleRole(Learner learner, Measurement measurement) {
		if (measurement.ran() && Experience.fromWire(learner.onboarding().experience()) == null) {
			return measuredRole(measurement);
		}
		return fallbackRole(learner);
	}

	// The declaration decides; facts only lift someone who saves now and then but does so every month.
	static Role fallbackRole(Learner learner) {
		return switch (Experience.fromWire(learner.onboarding().experience())) {
			case INVESTING, PLANNING -> Role.ADVANCED;
			case REGULAR -> Role.INTERMEDIATE;
			case OCCASIONAL -> occasionalSaverRole(learner.facts());
			case NOT_SAVING -> Role.NOVICE;
			case null -> Role.NOVICE;
		};
	}

	private static Role occasionalSaverRole(FactsDto facts) {
		if (facts != null && facts.savesRegularly()) {
			return Role.INTERMEDIATE;
		}
		return Role.NOVICE;
	}

	// One strong answered area is enough for intermediate; advanced needs every answered area Solid.
	static Role measuredRole(Measurement measurement) {
		List<FocusArea> answered = measurement.answers().stream().map(Answer::area).distinct().toList();
		if (answered.stream().noneMatch(area -> isAbove(measurement.mastery().get(area), SOLID_ABOVE))) {
			return Role.NOVICE;
		}
		if (answered.stream().allMatch(measurement::isSolid)) {
			return Role.ADVANCED;
		}
		return Role.INTERMEDIATE;
	}

	private static boolean isAbove(Double mastery, double threshold) {
		return mastery != null && mastery > threshold;
	}

	// After a Quick check without an answered area at least Building the role is novice, whoever judged it.
	static Role cappedRole(Role role, Measurement measurement) {
		if (!measurement.ran() || hasBuildingArea(measurement)) {
			return role;
		}
		return Role.NOVICE;
	}

	private static boolean hasBuildingArea(Measurement measurement) {
		return measurement.mastery().entrySet().stream()
			.anyMatch(area -> area.getValue() != null && area.getValue() >= JUST_STARTING_BELOW
					&& measurement.isAnswered(area.getKey()));
	}

	// The insertion order is the fixed priority.
	static List<FocusArea> fallbackFocus(Learner learner, Role role) {
		Set<FocusArea> areas = new LinkedHashSet<>(moneyFocus(learner));
		if (learner.lifeStage() == LifeStage.PRE_RETIREMENT) {
			areas.add(FocusArea.RETIREMENT);
		}
		if (role == Role.NOVICE) {
			areas.add(FocusArea.RISK);
		}
		areas.addAll(OrderRules.areasOf(learner.picked()));
		if (areas.isEmpty()) {
			return List.of(FocusArea.SAVING);
		}
		return List.copyOf(areas);
	}

	// Without bank data the savings cover from the survey stands in for the buffer fact.
	private static Set<FocusArea> moneyFocus(Learner learner) {
		Set<FocusArea> areas = new LinkedHashSet<>();
		FactsDto facts = learner.facts();
		if (facts != null && (facts.inOverdraft() || facts.hasLoan())) {
			areas.add(FocusArea.DEBT);
		}
		String buffer = learner.savingsCover();
		if (facts != null) {
			buffer = facts.cashBufferMonths();
		}
		if (buffer != null && SHORT_BUFFERS.contains(buffer)) {
			areas.add(FocusArea.SAVING);
		}
		if (facts != null && !facts.holdsInvestments() && BUFFER_6_PLUS.equals(buffer)) {
			areas.add(FocusArea.INVESTING);
		}
		return areas;
	}

	// None at the threshold gives the single most likely area.
	static List<FocusArea> focusFromNoul(Map<FocusArea, Double> noul) {
		List<FocusArea> mostLikelyFirst = Arrays.stream(FocusArea.values())
			.sorted(Comparator.comparing(noul::get).reversed())
			.toList();
		List<FocusArea> likely = mostLikelyFirst.stream().filter(area -> noul.get(area) >= FOCUS_THRESHOLD).toList();
		if (likely.isEmpty()) {
			return List.of(mostLikelyFirst.getFirst());
		}
		return likely;
	}

	static LessonVariantDto lessonVariant(Role role, LifeStage lifeStage) {
		LifeStage persona = lifeStage;
		if (lifeStage == LifeStage.ESTABLISHED) {
			// No lesson variant for this stage: it reads the base content.
			persona = null;
		}
		return switch (role) {
			case NOVICE -> new LessonVariantDto(persona, LessonLevel.BEGINNER, LessonLang.PLAIN);
			case INTERMEDIATE -> new LessonVariantDto(persona, LessonLevel.BEGINNER, LessonLang.STANDARD);
			case ADVANCED -> new LessonVariantDto(persona, LessonLevel.ADVANCED, LessonLang.STANDARD);
		};
	}

}
