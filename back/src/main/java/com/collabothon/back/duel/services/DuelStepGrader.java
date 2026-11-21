package com.collabothon.back.duel.services;

import org.springframework.stereotype.Component;

import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.node.ObjectNode;

/**
 * Grades one answer against its question. Sort and match are graded on the client (like in lessons), so the server
 * only checks that there were no mistakes.
 */
@Component
public class DuelStepGrader {

	private static final double EPSILON = 1e-9;

	public boolean grade(DuelQuestion question, ChosenAnswer answer) {
		if (answer == null) {
			return false;
		}
		ObjectNode step = question.step();
		return switch (question.type()) {
			case "quiz" -> answer.option() != null && answer.option() == step.path("correctIndex").asInt();
			case "predict", "chart" -> isWithinTolerance(step, answer.value());
			case "sort", "match" -> answer.mistakes() != null && answer.mistakes() == 0;
			default -> false;
		};
	}

	private static boolean isWithinTolerance(ObjectNode step, Double value) {
		if (value == null) {
			return false;
		}
		double target = step.path("answer").asDouble();
		double tolerance = step.path("tolerance").asDouble();
		return Math.abs(value - target) <= tolerance + EPSILON;
	}

}
