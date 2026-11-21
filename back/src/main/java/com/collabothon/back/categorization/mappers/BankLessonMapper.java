package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;
import com.collabothon.back.categorization.services.BankLesson;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface BankLessonMapper {

	@Mapping(target = "id", source = "lessonId")
	@Mapping(target = "title", source = "lessonTitle")
	@Mapping(target = "summary", source = "lessonSummary")
	@Mapping(target = "position", source = "lessonPosition")
	BankLesson toLesson(CheckQuestionProjection question);

}
