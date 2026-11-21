package com.collabothon.back.exceptions;

import lombok.Getter;

/**
 * The only exception a service throws for an expected failure. The response carries the code's status and Polish
 * message; the optional detail goes to the exception message only, for logs and debugging.
 */
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
