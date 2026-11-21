package com.collabothon.back.categorization.services;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.Confidence;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

/** One knowledge answer checked against the bank; {@code optionIndex} null = "Not sure". */
public record Answer(
		CheckQuestionProjection question,
		Integer optionIndex,
		Confidence confidence
) {

	public FocusArea area() {
		return question.area();
	}

	public AnswerResult result() {
		if (optionIndex == null) {
			return AnswerResult.NOT_SURE;
		}
		return optionIndex == question.correctIndex() ? AnswerResult.CORRECT : AnswerResult.WRONG;
	}

	public String misconception() {
		return result() == AnswerResult.WRONG ? question.misconceptions().get(optionIndex) : null;
	}

	public double score() {
		return result() == AnswerResult.CORRECT ? confidence.getCorrectScore() : CategorizationConsts.SCORE_WRONG;
	}

	/** "Not sure" counts as Guessing. */
	public double chip() {
		return (confidence == null ? Confidence.GUESSING : confidence).getChip();
	}

}
