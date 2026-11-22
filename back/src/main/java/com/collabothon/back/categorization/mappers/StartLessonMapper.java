package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.lesson.models.Story;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface StartLessonMapper {

	// The area is the one that picked the story, not the story's own.
	@Mapping(target = "area", source = "area")
	@Mapping(target = "storyId", source = "story.id")
	@Mapping(target = "storyCity", source = "story.city")
	StartLessonDto toDto(String lessonId, String title, FocusArea area, Story story);

}
