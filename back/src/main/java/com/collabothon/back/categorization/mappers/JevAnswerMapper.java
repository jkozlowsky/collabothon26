package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.services.Answer;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface JevAnswerMapper {

	@Mapping(target = "area", source = "question.area")
	@Mapping(target = "lessonId", source = "question.lessonId")
	@Mapping(target = "topic", source = "question.topic")
	@Mapping(target = "concepts", source = "question.concepts")
	@Mapping(target = "result", expression = "java(answer.result())")
	JevAnswerDto toJev(Answer answer);

}
