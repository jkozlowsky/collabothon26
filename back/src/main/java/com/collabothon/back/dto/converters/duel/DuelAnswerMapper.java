package com.collabothon.back.dto.converters.duel;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.collabothon.back.dto.duel.AnswerRequest;
import com.collabothon.back.dto.duel.AnswerResultDto;
import com.collabothon.back.dto.duel.DuelAnswerDto;
import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.dto.duel.YourFinalDto;
import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelAnswer;

@Mapper(componentModel = "spring")
public interface DuelAnswerMapper {

	ChosenAnswer toChosenAnswer(AnswerRequest request);

	DuelAnswerDto toDto(ChosenAnswer answer);

	@Mapping(target = "index", source = "answer.position")
	@Mapping(target = "correct", source = "answer.correct")
	@Mapping(target = "timedOut", source = "answer.timedOut")
	AnswerResultDto toResultDto(DuelAnswer answer, DuelQuestionDto nextQuestion, RivalSnapshotDto rivalProgress,
			YourFinalDto yourFinal, boolean finished);

}
