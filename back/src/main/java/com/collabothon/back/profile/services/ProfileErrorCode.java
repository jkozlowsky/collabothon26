package com.collabothon.back.profile.services;

import org.springframework.http.HttpStatus;
import com.collabothon.back.exceptions.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum ProfileErrorCode implements ErrorCode {

	ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "Nie znaleziono konta użytkownika.");

	private final HttpStatus status;
	private final String message;
}
