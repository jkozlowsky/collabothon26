package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.JevOnboardingAnswersDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface JevOnboardingAnswersMapper {

	JevOnboardingAnswersDto toJev(OnboardingAnswersDto answers);

}
