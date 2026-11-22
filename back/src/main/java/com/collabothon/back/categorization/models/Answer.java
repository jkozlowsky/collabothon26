package com.collabothon.back.categorization.models;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.FocusArea;

public record Answer(
		CheckQuestion question,
		AnswerResult result
) {

	public FocusArea area() {
		return question.area();
	}

	public boolean isCorrect() {
		return result == AnswerResult.CORRECT;
	}

	public double score() {
		if (isCorrect()) {
			return CategorizationConsts.SCORE_CORRECT;
		}
		return CategorizationConsts.SCORE_WRONG;
	}

}
