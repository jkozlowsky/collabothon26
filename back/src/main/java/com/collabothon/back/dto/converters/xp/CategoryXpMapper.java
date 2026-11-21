package com.collabothon.back.dto.converters.xp;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.collabothon.back.dto.xp.CategoryXpDto;
import com.collabothon.back.xp.services.LevelCurve.LevelInfo;

@Mapper(componentModel = "spring")
public interface CategoryXpMapper {

	@Mapping(target = "category", source = "category")
	@Mapping(target = "xp", source = "xp")
	@Mapping(target = "weeklyXp", source = "weeklyXp")
	CategoryXpDto toDto(String category, int xp, LevelInfo level, int weeklyXp);

}
