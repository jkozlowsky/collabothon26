package com.collabothon.back.duel;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.duel.DuelController.CategoryDto;
import com.collabothon.back.duel.DuelController.ProgressDto;
import com.collabothon.back.duel.DuelQueryService.CategoryStanding;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface CategoryMapper {

	@Mapping(target = "slug", source = "category.slug")
	@Mapping(target = "name", expression = "java(standing.category().getName(standing.lang()))")
	@Mapping(target = "icon", source = "category.icon")
	@Mapping(target = "xp", source = "progress.xp")
	@Mapping(target = "level", source = "level.level")
	@Mapping(target = "xpIntoLevel", source = "level.xpIntoLevel")
	@Mapping(target = "xpForLevel", source = "level.xpForLevel")
	@Mapping(target = "elo", source = "progress.elo")
	@Mapping(target = "humanMatches", source = "progress.humanMatches")
	CategoryDto toCategory(CategoryStanding standing);

	List<CategoryDto> toCategories(List<CategoryStanding> standings);

	@Mapping(target = "category", source = "category.slug")
	@Mapping(target = "xp", source = "progress.xp")
	@Mapping(target = "level", source = "level.level")
	@Mapping(target = "elo", source = "progress.elo")
	@Mapping(target = "accuracyLast30d", source = "accuracy")
	ProgressDto toProgressRow(CategoryStanding standing);

	List<ProgressDto> toProgress(List<CategoryStanding> standings);

}
