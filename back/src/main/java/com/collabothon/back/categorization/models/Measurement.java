package com.collabothon.back.categorization.models;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.enums.FocusArea;

import lombok.With;

// What the Quick check measured; without answers it did not run.
public record Measurement(
		@With
		List<FocusArea> order,
		Map<FocusArea, Double> mastery,
		List<Answer> answers
) {

	public static Measurement byRule(List<FocusArea> order, List<Answer> answers) {
		Map<FocusArea, Double> means = new LinkedHashMap<>();
		for (FocusArea area : order) {
			means.put(area, meanScore(answers.stream().filter(answer -> answer.area() == area).toList()));
		}
		return new Measurement(order, means, answers);
	}

	public boolean ran() {
		return !answers.isEmpty();
	}

	public List<Answer> inArea(FocusArea area) {
		return answers.stream().filter(answer -> answer.area() == area).toList();
	}

	public boolean isAnswered(FocusArea area) {
		return answers.stream().anyMatch(answer -> answer.area() == area);
	}

	public boolean isWithoutMistake() {
		return answers.stream().allMatch(Answer::isCorrect);
	}

	public boolean isSolid(FocusArea area) {
		Double value = mastery.get(area);
		return value != null && value > CategorizationConsts.SOLID_ABOVE
				&& inArea(area).size() >= CategorizationConsts.SOLID_MIN_ANSWERS;
	}

	public double masteryOrStart(FocusArea area) {
		return Objects.requireNonNullElse(mastery.get(area), CategorizationConsts.RULE_START);
	}

	private static Double meanScore(List<Answer> answers) {
		if (answers.isEmpty()) {
			return null;
		}
		return answers.stream().mapToDouble(Answer::score).average().orElseThrow();
	}

}
