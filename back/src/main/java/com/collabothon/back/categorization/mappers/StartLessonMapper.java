package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.StartLessonDto;
import com.collabothon.back.categorization.services.BankLesson;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface StartLessonMapper {

	@Mapping(target = "lessonId", source = "id")
	StartLessonDto toStartLesson(BankLesson lesson);

}
