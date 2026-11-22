package com.collabothon.back.exceptions;

import lombok.Getter;

// The detail stays in the exception message for debugging; the response shows only the code's message.
@Getter
public class BusinessException extends RuntimeException {

	private final ErrorCode code;

	public BusinessException(ErrorCode code) {
		super(code.name());
		this.code = code;
	}

	public BusinessException(ErrorCode code, String detail) {
		super(code.name() + ": " + detail);
		this.code = code;
	}

}
