package com.collabothon.back.dto.converters.lesson;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.lesson.models.LessonContentItem;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LessonSummaryMapper {

	LessonSummary toSummary(LessonContentItem lesson, String status);

}
