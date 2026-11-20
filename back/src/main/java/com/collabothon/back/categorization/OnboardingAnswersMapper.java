package com.collabothon.back.categorization;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.Categorization.OnboardingAnswers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface OnboardingAnswersMapper {

	@Mapping(target = "skipped", source = "onboardingSkipped")
	OnboardingAnswers toAnswers(ProfileAnswers profile);

}
