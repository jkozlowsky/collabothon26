package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.JevCheckDto;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface JevCheckMapper {

	@Mapping(target = "questionId", source = "question.id")
	JevCheckDto toJevCheck(CheckQuestionProjection question, String answer);

}
