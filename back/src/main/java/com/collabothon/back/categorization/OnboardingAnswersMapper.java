package com.collabothon.back.categorization;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.OnboardingAnswersDto;


@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface OnboardingAnswersMapper {

	@Mapping(target = "skipped", source = "onboardingSkipped")
	OnboardingAnswersDto toAnswers(ProfileAnswers profile);

}
