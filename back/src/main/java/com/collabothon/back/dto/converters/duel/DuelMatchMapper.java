package com.collabothon.back.dto.converters.duel;

import java.util.List;
import java.util.Map;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.dto.duel.MatchEndDto;
import com.collabothon.back.dto.duel.MatchStartDto;
import com.collabothon.back.dto.duel.MatchStateDto;
import com.collabothon.back.dto.duel.MatchSummaryDto;
import com.collabothon.back.dto.duel.MatchSummaryStatus;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.dto.duel.ReviewItemDto;
import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.dto.duel.YourFinalDto;
import com.collabothon.back.entities.duel.DuelMatch;

@Mapper(componentModel = "spring")
public interface DuelMatchMapper {

	@Mapping(target = "matchId", source = "match.id")
	MatchStartDto toStartDto(DuelMatch match, PlayerCardDto you, PlayerCardDto rival, int questionCount,
			DuelQuestionDto question);

	@Mapping(target = "matchId", source = "match.id")
	@Mapping(target = "finished", source = "match.finished")
	MatchStateDto toStateDto(DuelMatch match, PlayerCardDto you, PlayerCardDto rival, int questionCount,
			List<Boolean> yourResults, DuelQuestionDto question, RivalSnapshotDto rivalProgress,
			YourFinalDto yourFinal);

	@Mapping(target = "matchId", source = "match.id")
	MatchEndDto toEndDto(DuelMatch match, PlayerCardDto you, PlayerCardDto rival, Map<String, Integer> xpByCategory,
			List<ReviewItemDto> review);

	@Mapping(target = "matchId", source = "match.id")
	@Mapping(target = "status", source = "summaryStatus")
	@Mapping(target = "seen", source = "match.seenByPlayer")
	@Mapping(target = "score", source = "correctAnswers")
	MatchSummaryDto toSummaryDto(DuelMatch match, PlayerCardDto rival, MatchSummaryStatus summaryStatus,
			int correctAnswers);

}
