package com.collabothon.back.glossary.services;

import org.springframework.http.HttpStatus;

import com.collabothon.back.exceptions.ErrorCode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GlossaryErrorCode implements ErrorCode {

	TERM_NOT_FOUND(HttpStatus.NOT_FOUND, "Glossary term not found.");

	private final HttpStatus status;
	private final String message;

}
