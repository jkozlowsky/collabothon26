package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.JevConsts.ENOUGH_NOT_ASKED;
import static com.collabothon.back.categorization.consts.JevConsts.MAX_PROBABILITY;
import static com.collabothon.back.categorization.consts.JevConsts.MIN_PROBABILITY;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.ENOUGH;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.FIRST_LESSON;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.FOCUS_PREFIX;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.MASTERY_PREFIX;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.NEXT;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.ROLE;

import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.enums.WireNames;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.JevChoice;
import com.collabothon.back.categorization.models.JevQuickCheck;
import com.collabothon.back.categorization.models.Judgement;
import com.collabothon.back.categorization.models.StepJudgement;

import tools.jackson.databind.JsonNode;

// All or nothing: one answer that breaks the contract discards the whole response, never becomes a default answer.
final class JevResponses {

	private static final Pattern MODEL_ID = Pattern.compile(JevConsts.MODEL_ID_PATTERN);

	static Optional<Judgement> judgement(JsonNode response, Optional<JevQuickCheck> quickCheck) {
		if (response == null) {
			return Optional.empty();
		}
		JsonNode answers = response.path("answers");
		Optional<JevChoice<Role>> role = choice(answers.path(ROLE), List.of(Role.values()), WireNames::of);
		if (role.isEmpty()) {
			return Optional.empty();
		}
		List<FocusArea> areas = Arrays.asList(FocusArea.values());
		Optional<Map<FocusArea, Double>> focus = nouls(answers, FOCUS_PREFIX, areas);
		if (focus.isEmpty()) {
			return Optional.empty();
		}
		List<CheckLesson> offered = quickCheck.map(JevQuickCheck::lessons).orElse(List.of());
		Optional<CheckLesson> firstLesson = chosenLesson(answers.path(FIRST_LESSON), offered);
		if (!offered.isEmpty() && firstLesson.isEmpty()) {
			return Optional.empty();
		}
		JevChoice<Role> chosenRole = role.get();
		Map<FocusArea, Double> focusProbabilities = focus.get();
		return Optional.of(new Judgement(chosenRole.value(), chosenRole.probabilities(),
				CategorizationRules.focusFromNoul(focusProbabilities), FocusArea.byWire(focusProbabilities),
				modelId(response.path("model")), firstLesson));
	}

	static Optional<StepJudgement> stepJudgement(JsonNode response, JsonNode asked, List<CheckLesson> lessons,
			Duration elapsed) {
		if (response == null) {
			return Optional.empty();
		}
		JsonNode answers = response.path("answers");
		List<FocusArea> ratedAreas = Arrays.stream(FocusArea.values())
			.filter(area -> asked.has(MASTERY_PREFIX + area.wire()))
			.toList();
		Optional<Map<FocusArea, Double>> mastery = nouls(answers, MASTERY_PREFIX, ratedAreas);
		if (mastery.isEmpty()) {
			return Optional.empty();
		}
		Optional<Double> enough = Optional.of(ENOUGH_NOT_ASKED);
		if (asked.has(ENOUGH)) {
			enough = noul(answers.path(ENOUGH));
		}
		Optional<CheckLesson> next = Optional.empty();
		if (asked.has(NEXT)) {
			next = chosenLesson(answers.path(NEXT), lessons);
		}
		if (enough.isEmpty() || (asked.has(NEXT) && next.isEmpty())) {
			return Optional.empty();
		}
		return Optional.of(new StepJudgement(mastery.get(), next, enough.get(), elapsed));
	}

	private static Optional<Map<FocusArea, Double>> nouls(JsonNode answers, String prefix, List<FocusArea> areas) {
		Map<FocusArea, Double> probabilities = new EnumMap<>(FocusArea.class);
		for (FocusArea area : areas) {
			Optional<Double> probability = noul(answers.path(prefix + area.wire()));
			if (probability.isEmpty()) {
				return Optional.empty();
			}
			probabilities.put(area, probability.get());
		}
		return Optional.of(probabilities);
	}

	private static Optional<CheckLesson> chosenLesson(JsonNode answer, List<CheckLesson> offered) {
		return choice(answer, offered, CheckLesson::label).map(JevChoice::value);
	}

	// Every option has a probability and the chosen one is among the most probable.
	private static <T> Optional<JevChoice<T>> choice(JsonNode answer, List<T> options, Function<T, String> labelOf) {
		Map<String, T> byLabel = options.stream().collect(Collectors.toMap(labelOf, Function.identity()));
		JsonNode label = answer.path("choice");
		if (!label.isString()) {
			return Optional.empty();
		}
		String chosen = label.stringValue();
		if (!byLabel.containsKey(chosen)) {
			return Optional.empty();
		}
		return probabilities(answer.path("probabilities"), byLabel.keySet())
			.filter(parsed -> parsed.get(chosen) >= Collections.max(parsed.values()))
			.map(parsed -> new JevChoice<>(byLabel.get(chosen), parsed));
	}

	private static Optional<Map<String, Double>> probabilities(JsonNode node, Set<String> labels) {
		if (!node.isObject()) {
			return Optional.empty();
		}
		Map<String, Double> parsed = new LinkedHashMap<>();
		for (Map.Entry<String, JsonNode> entry : node.properties()) {
			Optional<Double> probability = probability(entry.getValue());
			if (probability.isEmpty()) {
				return Optional.empty();
			}
			parsed.put(entry.getKey(), probability.get());
		}
		if (!parsed.keySet().equals(labels)) {
			return Optional.empty();
		}
		return Optional.of(parsed);
	}

	private static Optional<Double> noul(JsonNode answer) {
		return probability(answer.path("noul"));
	}

	private static Optional<Double> probability(JsonNode value) {
		if (!value.isNumber()) {
			return Optional.empty();
		}
		double probability = value.doubleValue();
		if (probability >= MIN_PROBABILITY && probability <= MAX_PROBABILITY) {
			return Optional.of(probability);
		}
		return Optional.empty();
	}

	private static String modelId(JsonNode model) {
		if (model.isString() && MODEL_ID.matcher(model.stringValue()).matches()) {
			return model.stringValue();
		}
		return null;
	}

}
