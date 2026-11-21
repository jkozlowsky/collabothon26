package com.collabothon.back.dto.converters.lesson;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.dto.lesson.LessonSummary;

@Mapper(componentModel = "spring")
public interface LessonSummaryMapper {

	@Mapping(target = "status", source = "status")
	LessonSummary toSummary(LessonContentItem lesson, String status);

}
