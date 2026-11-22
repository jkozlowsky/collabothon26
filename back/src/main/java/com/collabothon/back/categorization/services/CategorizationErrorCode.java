package com.collabothon.back.categorization.services;

import org.springframework.http.HttpStatus;

import com.collabothon.back.exceptions.ErrorCode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CategorizationErrorCode implements ErrorCode {

	NOT_CATEGORISED_YET(HttpStatus.NOT_FOUND, "Not categorised yet"),
	FINISH_ONBOARDING_FIRST(HttpStatus.NOT_FOUND, "Finish onboarding first"),
	MASTERY_ONLY_FOR_QUESTION_AREAS(HttpStatus.BAD_REQUEST, "Mastery is only kept for areas with questions"),
	ANSWER_EACH_QUESTION_ONCE(HttpStatus.BAD_REQUEST, "Answer each known question once"),
	PICK_ONE_OPTION(HttpStatus.BAD_REQUEST, "Pick one of the question's options");

	private final HttpStatus status;

	private final String message;

}
