package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.models.CheckQuestion;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CheckQuestionMapper {

	CheckQuestionDto toDto(CheckQuestion question);

}
