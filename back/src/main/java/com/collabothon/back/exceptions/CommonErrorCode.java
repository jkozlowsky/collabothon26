package com.collabothon.back.exceptions;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

/** Generic codes for failures that belong to no single feature. */
@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum CommonErrorCode implements ErrorCode {

	NOT_FOUND(HttpStatus.NOT_FOUND, "Nie znaleziono zasobu."),
	BAD_REQUEST(HttpStatus.BAD_REQUEST, "Nieprawidłowe żądanie.");

	private final HttpStatus status;

	private final String message;

}
