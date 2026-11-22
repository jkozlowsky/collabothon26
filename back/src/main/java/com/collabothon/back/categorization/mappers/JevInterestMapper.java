package com.collabothon.back.categorization.mappers;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.JevInterestDto;
import com.collabothon.back.categorization.services.Story;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface JevInterestMapper {

	List<JevInterestDto> toJev(List<Story> picked);

}
