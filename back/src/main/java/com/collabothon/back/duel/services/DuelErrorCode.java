package com.collabothon.back.duel.services;

import org.springframework.http.HttpStatus;

import com.collabothon.back.exceptions.ErrorCode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DuelErrorCode implements ErrorCode {

	UNKNOWN_CATEGORY(HttpStatus.BAD_REQUEST, "Unknown category."),
	ANSWER_OUT_OF_ORDER(HttpStatus.BAD_REQUEST, "Answer to an unexpected question."),
	ALL_QUESTIONS_ANSWERED(HttpStatus.BAD_REQUEST, "All questions have already been answered."),
	MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "Duel not found."),
	MATCH_NOT_FINISHED(HttpStatus.CONFLICT, "Duel is still in progress.");

	private final HttpStatus status;

	private final String message;

}
