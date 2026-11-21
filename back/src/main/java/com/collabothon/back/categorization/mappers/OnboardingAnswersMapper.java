package com.collabothon.back.categorization.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.repositories.projections.ProfileAnswersProjection;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface OnboardingAnswersMapper {

	@Mapping(target = "skipped", source = "onboardingSkipped")
	OnboardingAnswersDto toAnswers(ProfileAnswersProjection profile);

}
