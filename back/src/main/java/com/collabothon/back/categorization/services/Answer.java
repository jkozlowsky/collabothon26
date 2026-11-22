package com.collabothon.back.categorization.services;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.enums.AnswerResult;
import com.collabothon.back.categorization.enums.FocusArea;

/** One knowledge answer checked against the pool; {@code optionIndex} null = "Not sure". */
public record Answer(
		CheckQuestion question,
		Integer optionIndex
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

	public JevAnswerDto toJev() {
		return new JevAnswerDto(area(), question.lessonId(), question.topic(), question.concepts(), result());
	}

	public double score() {
		return result() == AnswerResult.CORRECT ? CategorizationConsts.SCORE_CORRECT : CategorizationConsts.SCORE_WRONG;
	}

}
