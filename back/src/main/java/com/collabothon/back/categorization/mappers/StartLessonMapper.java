package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.services.Story;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface StartLessonMapper {

	@Mapping(target = "lessonId", source = "lessonId")
	@Mapping(target = "title", source = "title")
	@Mapping(target = "area", source = "area")
	@Mapping(target = "storyId", source = "story.id")
	@Mapping(target = "storyCity", source = "story.city")
	StartLessonDto toStartLesson(Story story, String lessonId, String title, FocusArea area);

}
