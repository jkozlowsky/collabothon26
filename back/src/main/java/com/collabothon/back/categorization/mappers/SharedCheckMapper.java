package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.SharedCheckDto;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface SharedCheckMapper {

	@Mapping(target = "questionId", source = "question.id")
	SharedCheckDto toShared(CheckQuestionProjection question, boolean answered);

}
