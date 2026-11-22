package com.collabothon.back.categorization.mappers;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.categorization.dto.JevAnswerDto;
import com.collabothon.back.categorization.dto.JevInterestDto;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.lesson.models.Story;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface JevStateMapper {

	List<JevInterestDto> toInterests(List<Story> picked);

	List<JevAnswerDto> toAnswers(List<Answer> answers);

	@Mapping(target = "area", source = "question.area")
	@Mapping(target = "lessonId", source = "question.lessonId")
	@Mapping(target = "topic", source = "question.topic")
	@Mapping(target = "concepts", source = "question.concepts")
	JevAnswerDto toAnswer(Answer answer);

}
