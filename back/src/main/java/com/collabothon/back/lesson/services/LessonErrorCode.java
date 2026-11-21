package com.collabothon.back.lesson.services;

import org.springframework.http.HttpStatus;
import com.collabothon.back.exceptions.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum LessonErrorCode implements ErrorCode {

	LESSON_NOT_FOUND(HttpStatus.NOT_FOUND, "Lesson not found."),
	INVALID_STEP(HttpStatus.BAD_REQUEST, "Invalid lesson step."),
	INVALID_SCENARIO_CHOICE(HttpStatus.BAD_REQUEST, "Invalid scenario choice."),
	PREVIOUS_LESSON_LOCKED(HttpStatus.FORBIDDEN, "Complete the previous lesson in this story first.");

	private final HttpStatus status;
	private final String message;
}
