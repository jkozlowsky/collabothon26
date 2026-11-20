package com.collabothon.back.duel;

import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.duel.DuelMessage.MatchStart;
import com.collabothon.back.duel.DuelMessage.MatchState;
import com.collabothon.back.duel.DuelMessage.Question;
import com.collabothon.back.duel.DuelMessage.QuestionPayload;
import com.collabothon.back.duel.DuelMessage.RivalProgress;
import com.collabothon.back.duel.DuelMessage.RivalProgressPayload;
import com.collabothon.back.duel.MatchAssembler.LiveQuestion;
import com.collabothon.back.duel.MatchAssembler.MatchStateView;
import com.collabothon.back.duel.MatchAssembler.MatchView;
import com.collabothon.back.duel.MatchAssembler.RivalSnapshot;

/** The live frames of a running match. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR,
		injectionStrategy = InjectionStrategy.CONSTRUCTOR, uses = PlayerCardMapper.class)
interface MatchMessageMapper {

	MatchStart toStart(MatchView view);

	Question toQuestion(LiveQuestion question);

	QuestionPayload toPayload(LiveQuestion question);

	RivalProgress toRivalProgress(RivalSnapshot rival);

	RivalProgressPayload toPayload(RivalSnapshot rival);

	@Mapping(target = "matchId", source = "match.matchId")
	@Mapping(target = "mode", source = "match.mode")
	@Mapping(target = "category", source = "match.category")
	@Mapping(target = "you", source = "match.you")
	@Mapping(target = "rival", source = "match.rival")
	@Mapping(target = "questionCount", source = "match.questionCount")
	@Mapping(target = "yourResults", source = "yourResults")
	@Mapping(target = "question", source = "question")
	@Mapping(target = "rivalProgress", source = "rivalProgress")
	MatchState toState(MatchStateView state);

}
