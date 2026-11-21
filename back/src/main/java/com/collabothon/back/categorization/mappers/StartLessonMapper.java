package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface StartLessonMapper {

	@Mapping(target = "title", source = "lessonTitle")
	StartLessonDto toStartLesson(CheckQuestionProjection lessonQuestion);

}
