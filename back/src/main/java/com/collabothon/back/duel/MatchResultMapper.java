package com.collabothon.back.duel;

import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.duel.DuelController.MatchEndDto;
import com.collabothon.back.duel.DuelController.ReviewItemDto;
import com.collabothon.back.duel.MatchAssembler.MatchResult;
import com.collabothon.back.duel.MatchAssembler.ReviewEntry;

/** The finished-match summary for the result screen. */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR,
		injectionStrategy = InjectionStrategy.CONSTRUCTOR, uses = PlayerCardMapper.class)
interface MatchResultMapper {

	@Mapping(target = "outcome", source = "progression.outcome")
	@Mapping(target = "xpGained", source = "progression.xpGained")
	@Mapping(target = "levelBefore", source = "progression.levelBefore")
	@Mapping(target = "levelAfter", source = "progression.levelAfter")
	@Mapping(target = "xpIntoLevel", source = "progression.xpIntoLevel")
	@Mapping(target = "xpForLevel", source = "progression.xpForLevel")
	@Mapping(target = "eloBefore", source = "progression.eloBefore")
	@Mapping(target = "eloAfter", source = "progression.eloAfter")
	MatchEndDto toDto(MatchResult result);

	@Mapping(target = "prompt", source = "question.prompt")
	@Mapping(target = "options", source = "question.options")
	@Mapping(target = "correctOption", source = "question.correctOption")
	@Mapping(target = "explanation", source = "question.explanation")
	ReviewItemDto toDto(ReviewEntry entry);

}
