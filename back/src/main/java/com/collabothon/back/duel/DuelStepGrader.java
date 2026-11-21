package com.collabothon.back.duel;

import org.springframework.stereotype.Component;

import com.collabothon.back.duel.DuelContent.QuestionDef;

import tools.jackson.databind.node.ObjectNode;

@Component
public class DuelStepGrader {

	private static final double EPSILON = 1e-9;

	public boolean grade(QuestionDef question, DuelAnswerDto answer) {
		if (answer == null) {
			return false;
		}
		ObjectNode step = question.step();
		String type = step.path("type").asString();
		return switch (type) {
			case "quiz" -> answer.option() != null && answer.option() == step.path("correctIndex").asInt();
			case "predict", "chart" -> {
				if (answer.value() == null) {
					yield false;
				}
				double target = step.path("answer").asDouble();
				double tolerance = step.path("tolerance").asDouble();
				yield Math.abs(answer.value() - target) <= tolerance + EPSILON;
			}
			case "sort", "match" -> answer.mistakes() != null && answer.mistakes() == 0;
			default -> false;
		};
	}

}
