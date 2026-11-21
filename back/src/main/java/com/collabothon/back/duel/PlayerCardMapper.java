package com.collabothon.back.duel;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.duel.DuelController.PlayerCardDto;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface PlayerCardMapper {

	@Mapping(target = "isBot", source = "bot")
	PlayerCardDto toDto(PlayerCard card);

}
