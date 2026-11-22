package com.collabothon.back.dto.converters.duel;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import com.collabothon.back.dto.duel.AnswerRequest;
import com.collabothon.back.dto.duel.AnswerResultDto;
import com.collabothon.back.dto.duel.DuelAnswerDto;
import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.dto.duel.ReviewItemDto;
import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.dto.duel.YourFinalDto;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelAnswer;

import tools.jackson.databind.node.ObjectNode;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface DuelAnswerMapper {

	ChosenAnswer toChosenAnswer(AnswerRequest request);

	DuelAnswerDto toDto(ChosenAnswer answer);

	@Mapping(target = "index", source = "answer.position")
	@Mapping(target = "correct", source = "answer.correct")
	@Mapping(target = "timedOut", source = "answer.timedOut")
	AnswerResultDto toResultDto(DuelAnswer answer, DuelQuestionDto nextQuestion, RivalSnapshotDto rivalProgress,
			YourFinalDto yourFinal, boolean finished);

	// The category is the recomputed question's, not the stored answer's.
	@Mapping(target = "index", source = "answer.position")
	@Mapping(target = "category", source = "question.category")
	@Mapping(target = "step", source = "reviewStep")
	@Mapping(target = "yourAnswer", source = "answer.chosenAnswer")
	@Mapping(target = "correct", source = "answer.correct")
	ReviewItemDto toReviewItem(DuelAnswer answer, DuelQuestion question, ObjectNode reviewStep, String lessonTitle);

}
