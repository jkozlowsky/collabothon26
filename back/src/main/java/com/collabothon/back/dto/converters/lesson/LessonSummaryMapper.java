package com.collabothon.back.dto.converters.lesson;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.dto.lesson.LessonSummary;

@Mapper(componentModel = "spring")
public interface LessonSummaryMapper {

	@Mapping(target = "status", source = "status")
	@Mapping(target = "video", expression = "java(video(lesson))")
	LessonSummary toSummary(LessonContentItem lesson, String status);

	/** Present when the lesson file has a video track. */
	default LessonSummary.VideoSummary video(LessonContentItem lesson) {
		if (!lesson.node().hasNonNull("video")) {
			return null;
		}
		return new LessonSummary.VideoSummary(lesson.node().path("video").path("minutes").asInt());
	}

}
