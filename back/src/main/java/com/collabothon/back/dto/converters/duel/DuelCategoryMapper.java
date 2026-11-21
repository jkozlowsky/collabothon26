package com.collabothon.back.dto.converters.duel;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.collabothon.back.dto.duel.CategoryDto;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.xp.services.LevelCurve.LevelInfo;

@Mapper(componentModel = "spring")
public interface DuelCategoryMapper {

	@Mapping(target = "story", source = "story.id")
	@Mapping(target = "name", source = "story.category")
	@Mapping(target = "icon", source = "story.icon")
	@Mapping(target = "color", source = "story.color")
	@Mapping(target = "xp", source = "xp")
	@Mapping(target = "level", source = "level.level")
	@Mapping(target = "xpIntoLevel", source = "level.xpIntoLevel")
	@Mapping(target = "xpForLevel", source = "level.xpForLevel")
	CategoryDto toDto(Story story, int xp, LevelInfo level);

}
