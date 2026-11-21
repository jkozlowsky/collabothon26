package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.CheckDto;
import com.collabothon.back.categorization.enums.CheckResult;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CheckMapper {

	@Mapping(target = "questionId", source = "question.id")
	CheckDto toCheck(CheckQuestionProjection question, CheckResult result);

}
