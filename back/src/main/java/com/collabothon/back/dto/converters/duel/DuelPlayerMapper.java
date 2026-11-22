package com.collabothon.back.dto.converters.duel;

import java.util.Map;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.dto.duel.RankingRowDto;
import com.collabothon.back.duel.models.PlayerIdentity;
import com.collabothon.back.duel.models.RankedPlayer;
import com.collabothon.back.xp.services.WeeklyStanding;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface DuelPlayerMapper {

	PlayerCardDto toCard(PlayerIdentity identity, Map<String, Integer> levels);

	@Mapping(target = "name", source = "player.identity.name")
	@Mapping(target = "avatar", source = "player.identity.avatar")
	@Mapping(target = "previousRank", ignore = true)
	@Mapping(target = "lastXpEventId", ignore = true)
	RankingRowDto toTopRow(int rank, int weeklyXp, RankedPlayer player);

	@Mapping(target = "name", source = "player.identity.name")
	@Mapping(target = "avatar", source = "player.identity.avatar")
	RankingRowDto toOwnRow(WeeklyStanding standing, RankedPlayer player);

}
