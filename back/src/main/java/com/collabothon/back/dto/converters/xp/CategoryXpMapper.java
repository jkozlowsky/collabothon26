package com.collabothon.back.dto.converters.xp;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import com.collabothon.back.dto.xp.CategoryXpDto;
import com.collabothon.back.xp.services.LevelInfo;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CategoryXpMapper {

	@Mapping(target = "category", source = "category")
	@Mapping(target = "xp", source = "xp")
	@Mapping(target = "weeklyXp", source = "weeklyXp")
	CategoryXpDto toDto(String category, int xp, LevelInfo level, int weeklyXp);

}
