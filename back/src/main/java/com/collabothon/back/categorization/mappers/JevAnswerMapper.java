package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.services.Answer;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface JevAnswerMapper {

	@Mapping(target = "area", expression = "java(answer.area())")
	@Mapping(target = "result", expression = "java(answer.result())")
	@Mapping(target = "misconception", expression = "java(answer.misconception())")
	JevAnswerDto toJev(Answer answer);

}
