package com.collabothon.back.duel;

import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.duel.DuelController.AnswerResultDto;
import com.collabothon.back.duel.DuelController.MatchStartDto;
import com.collabothon.back.duel.DuelController.MatchStateDto;
import com.collabothon.back.duel.DuelController.QuestionDto;
import com.collabothon.back.duel.DuelController.RivalProgressDto;
import com.collabothon.back.duel.MatchAssembler.AnswerOutcome;
import com.collabothon.back.duel.MatchAssembler.LiveQuestion;
import com.collabothon.back.duel.MatchAssembler.MatchStateView;
import com.collabothon.back.duel.MatchAssembler.RivalSnapshot;
import com.collabothon.back.duel.MatchAssembler.StartView;

/** The live part of a match as the REST DTOs. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR,
		injectionStrategy = InjectionStrategy.CONSTRUCTOR, uses = PlayerCardMapper.class)
interface MatchViewMapper {

	MatchStartDto toDto(StartView start);

	AnswerResultDto toDto(AnswerOutcome outcome);

	MatchStateDto toDto(MatchStateView state);

	QuestionDto toDto(LiveQuestion question);

	RivalProgressDto toDto(RivalSnapshot rival);

}
