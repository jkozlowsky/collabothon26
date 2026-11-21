package com.collabothon.back.glossary.services;

import org.springframework.http.HttpStatus;
import com.collabothon.back.exceptions.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum GlossaryErrorCode implements ErrorCode {

	TERM_NOT_FOUND(HttpStatus.NOT_FOUND, "Glossary term not found."),
	INVALID_QUERY(HttpStatus.BAD_REQUEST, "Query must be between 1 and 64 characters.");

	private final HttpStatus status;
	private final String message;
}
