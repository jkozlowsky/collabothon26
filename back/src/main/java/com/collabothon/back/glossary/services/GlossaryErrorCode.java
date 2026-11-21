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

	TERM_NOT_FOUND(HttpStatus.NOT_FOUND, "Nie znaleziono hasła w słowniku."),
	INVALID_QUERY(HttpStatus.BAD_REQUEST, "Zapytanie musi mieć od 1 do 64 znaków.");

	private final HttpStatus status;
	private final String message;
}
