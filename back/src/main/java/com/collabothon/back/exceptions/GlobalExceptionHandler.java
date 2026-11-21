package com.collabothon.back.exceptions;

import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Maps {@link BusinessException} to an RFC 9457 problem detail with an extra {@code code} property. The base class
 * already covers malformed JSON, bean validation and {@code ResponseStatusException}.
 */
@RestControllerAdvice
class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	static final String CODE_PROPERTY = "code";

	@ExceptionHandler(BusinessException.class)
	ProblemDetail business(BusinessException e) {
		ErrorCode code = e.getCode();
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(code.status(), code.message());
		problem.setProperty(CODE_PROPERTY, code.name());
		return problem;
	}

}
