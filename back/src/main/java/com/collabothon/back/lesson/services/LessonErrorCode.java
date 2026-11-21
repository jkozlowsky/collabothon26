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

	LESSON_NOT_FOUND(HttpStatus.NOT_FOUND, "Nie znaleziono lekcji."),
	INVALID_LANG(HttpStatus.BAD_REQUEST, "Język musi być standardowy lub uproszczony."),
	INVALID_STEP(HttpStatus.BAD_REQUEST, "Nieprawidłowy krok lekcji."),
	INVALID_SCENARIO_CHOICE(HttpStatus.BAD_REQUEST, "Nieprawidłowy wybór scenariusza."),
	PREVIOUS_LESSON_LOCKED(HttpStatus.FORBIDDEN, "Ukończ najpierw poprzednią lekcję w tej historii.");

	private final HttpStatus status;
	private final String message;
}
