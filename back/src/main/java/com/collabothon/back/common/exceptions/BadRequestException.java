package com.collabothon.back.common.exceptions;

public class BadRequestException extends RuntimeException {

	public BadRequestException(String message) {
		super(message);
	}

}
