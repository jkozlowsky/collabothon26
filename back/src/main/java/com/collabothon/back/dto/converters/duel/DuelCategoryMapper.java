package com.collabothon.back.dto.converters.duel;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import com.collabothon.back.dto.duel.CategoryDto;
import com.collabothon.back.dto.duel.CategoryMatchEndDto;
import com.collabothon.back.duel.models.CategoryStyle;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.xp.services.LevelInfo;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface DuelCategoryMapper {

	// The JSON field is still called "story" although it holds an area slug.
	@Mapping(target = "story", source = "areaSlug")
	@Mapping(target = "name", source = "firstStory.area")
	@Mapping(target = "icon", source = "style.icon")
	@Mapping(target = "color", source = "style.color")
	@Mapping(target = "level", source = "level.level")
	CategoryDto toDto(String areaSlug, Story firstStory, CategoryStyle style, int xp, LevelInfo level);

	@Mapping(target = "story", source = "areaSlug")
	@Mapping(target = "levelBefore", source = "before.level")
	@Mapping(target = "levelAfter", source = "after.level")
	@Mapping(target = "xpIntoLevelAfter", source = "after.xpIntoLevel")
	@Mapping(target = "xpForLevelAfter", source = "after.xpForLevel")
	CategoryMatchEndDto toEndDto(String areaSlug, int xpGained, int xpBefore, int xpAfter, LevelInfo before,
			LevelInfo after);

}
