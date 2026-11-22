package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.services.CheckLesson;
import com.collabothon.back.categorization.services.CheckQuestion;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CheckLessonMapper {

	@Mapping(target = "id", source = "lessonId")
	CheckLesson toLesson(CheckQuestion question);

}
