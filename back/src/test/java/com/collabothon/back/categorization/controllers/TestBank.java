package com.collabothon.back.categorization.controllers;

import java.util.Arrays;
import java.util.List;

import com.collabothon.back.categorization.entities.CheckQuestion;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.QuestionLevel;
import com.collabothon.back.categorization.enums.WireNames;
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;

/**
 * A test's own bank: option 0 is right, options 1 and 2 carry "Thinks 1 <id>" and "Thinks 2 <id>". Call inside a
 * rolled-back test transaction.
 */
final class TestBank {

	private final CheckQuestionRepository questions;

	TestBank(CheckQuestionRepository questions) {
		this.questions = questions;
		questions.deleteAllInBatch();
	}

	void question(String id, String lessonId, String area, String level) {
		questions.save(CheckQuestion.builder()
			.id(id)
			.lessonId(lessonId)
			.area(WireNames.fromWire(FocusArea.class, area))
			.level(WireNames.fromWire(QuestionLevel.class, level))
			.slots(List.of())
			.genericPrompt("Prompt " + id)
			.options(List.of("Right", "Wrong one", "Wrong two"))
			.correctIndex(0)
			.misconceptions(Arrays.asList(null, "Thinks 1 " + id, "Thinks 2 " + id))
			.checks("Whether " + id)
			.build());
	}

}
