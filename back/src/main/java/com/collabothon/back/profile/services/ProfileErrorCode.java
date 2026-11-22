package com.collabothon.back.profile.services;

import org.springframework.http.HttpStatus;

import com.collabothon.back.exceptions.ErrorCode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProfileErrorCode implements ErrorCode {

	ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "User account not found."),
	ACCOUNT_IN_USE(HttpStatus.CONFLICT, "Account is currently in use by another device."),
	UNKNOWN_INTEREST(HttpStatus.BAD_REQUEST, "Pick interests from the lesson paths.");

	private final HttpStatus status;
	private final String message;

}
