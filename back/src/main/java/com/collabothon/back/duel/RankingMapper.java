package com.collabothon.back.duel;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.duel.DuelController.RankingRowDto;
import com.collabothon.back.duel.DuelController.RankingsDto;
import com.collabothon.back.duel.RankingService.RankedEntry;
import com.collabothon.back.duel.RankingService.Ranking;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface RankingMapper {

	@Mapping(target = "userId", source = "player.userId")
	@Mapping(target = "name", source = "player.displayName")
	@Mapping(target = "avatar", source = "player.avatar")
	RankingRowDto toRow(RankedEntry entry);

	RankingsDto toDto(Ranking ranking);

}
