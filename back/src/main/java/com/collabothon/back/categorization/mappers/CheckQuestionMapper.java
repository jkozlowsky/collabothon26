package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.services.CheckQuestion;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CheckQuestionMapper {

	CheckQuestionDto toDto(CheckQuestion question);

}
