package com.collabothon.back.duel.services;

import org.springframework.http.HttpStatus;

import com.collabothon.back.exceptions.ErrorCode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum DuelErrorCode implements ErrorCode {

	USER_ID_BLANK(HttpStatus.BAD_REQUEST, "Brak identyfikatora użytkownika."),
	INVALID_CATEGORY_COUNT(HttpStatus.BAD_REQUEST, "Wybierz od 1 do 4 kategorii."),
	UNKNOWN_CATEGORY(HttpStatus.BAD_REQUEST, "Nieznana kategoria."),
	ANSWER_OUT_OF_ORDER(HttpStatus.BAD_REQUEST, "Odpowiedź na nieoczekiwane pytanie."),
	ALL_QUESTIONS_ANSWERED(HttpStatus.BAD_REQUEST, "Wszystkie pytania mają już odpowiedź."),
	MATCH_NOT_FOUND(HttpStatus.NOT_FOUND, "Nie znaleziono pojedynku."),
	MATCH_NOT_FINISHED(HttpStatus.CONFLICT, "Pojedynek jeszcze trwa.");

	private final HttpStatus status;

	private final String message;

}
