package com.collabothon.back.xp.services;

import org.springframework.http.HttpStatus;

import com.collabothon.back.exceptions.ErrorCode;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum XpErrorCode implements ErrorCode {

	INVALID_XP_AMOUNT(HttpStatus.BAD_REQUEST, "Invalid XP amount.");

	private final HttpStatus status;

	private final String message;

}
